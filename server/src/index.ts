import express from 'express';
import http from 'http';
import path from 'path';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { GameEngine } from './logic/GameEngine';
import { GameState, Card, GameSettings, GameType, Suit, CardValue } from './logic/types';
import { Bot } from './logic/Bot';
import { validatePlayerName } from './utils/validation';

const app = express();

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../../dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

interface Room {
  id: string;
  players: {
      id: string;
      name: string;
      socketId: string;
      ready: boolean;
      isBot?: boolean;
      connected: boolean;
      disconnectTime?: number;
  }[];
  gameState: GameState | null;
  settings: GameSettings;
}

const rooms: Record<string, Room> = Object.create(null);
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

const MAX_ROOMS = 100;
const CREATE_ROOM_RATE_LIMIT = 30000; // 30 seconds
const BOT_TURN_DELAY_MS = 1000;
const BOT_BID_DELAY_MS = 500;
const TRICK_EVALUATION_DELAY_MS = 1500;
const lastRoomCreation: Map<string, number> = new Map();

// Helper to generate room ID
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

const defaultSettings: GameSettings = {
  mitNeunen: false,
  dullenAlsHoechste: true,
  schweinchen: false,
  fuchsGefangen: true,
  karlchen: true,
  doppelkopfPunkte: true,
  soloPrioritaet: true,
};

// Helper to sanitize state for a specific player
const sanitizeState = (state: GameState, playerId: string): GameState => {
  const newState = { ...state };
  newState.players = state.players.map(p => {
    if (p.id === playerId) {
      return p;
    } else {
      return { ...p, hand: [] };
    }
  });
  return newState;
};

// Helper to emit state to room
const emitToRoom = (roomId: string, event: string, state: GameState) => {
  const room = rooms[roomId];
  if (!room) return;

  // Sync connection status to state players
  state.players.forEach(gp => {
      const rp = room.players.find(rp => rp.id === gp.id);
      if (rp) {
          gp.connected = rp.connected;
          gp.disconnectTime = rp.disconnectTime;
      }
  });

  room.players.forEach(p => {
    if (!p.isBot && p.socketId && p.connected) {
      const sanitized = sanitizeState(state, p.id);
      io.to(p.socketId).emit(event, sanitized);
    }
  });
};

// Helper to handle bot turns
const handleBotTurns = (roomId: string) => {
  const room = rooms[roomId];
  if (!room || !room.gameState || room.gameState.phase !== 'Playing') return;

  const state = room.gameState;
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (currentPlayer && currentPlayer.isBot) {
    setTimeout(() => {
      // Re-check if it's still this bot's turn and game is still playing
      if (rooms[roomId]?.gameState?.currentPlayerIndex !== state.currentPlayerIndex) return;

      try {
        const card = Bot.decideMove(currentPlayer, state, room.settings);
        executePlayCard(roomId, currentPlayer.id, card);
      } catch (e) {
        console.error('Bot error:', e);
      }
    }, BOT_TURN_DELAY_MS);
  }
};

const executePlayCard = (roomId: string, playerId: string, card: Card) => {
  const room = rooms[roomId];
  if (!room || !room.gameState) return;

  const state = room.gameState;
  if (state.phase !== 'Playing') return;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  const currentPlayerIndex = state.currentPlayerIndex;
  const currentPlayer = state.players[currentPlayerIndex];
  if (currentPlayer.id !== playerId) return;

  // Security: Verify card exists in player's hand
  const cardInHand = currentPlayer.hand.find(c => c.id === card.id);
  if (!cardInHand) {
    console.warn(`Player ${playerId} attempted to play a card not in hand: ${JSON.stringify(card)}`);
    return;
  }

  // Security: Verify move is valid according to game rules
  if (!GameEngine.isValidMove(cardInHand, currentPlayer, state.currentTrick, state.gameType, state.trumpSuit, room.settings)) {
    console.warn(`Player ${playerId} attempted an invalid move: ${JSON.stringify(cardInHand)}`);
    return;
  }

  const newHand = currentPlayer.hand.filter(c => c.id !== cardInHand.id);
  const newTrick = [...state.currentTrick, cardInHand];
  
  // Reveal team if Kreuz-Dame is played
  if (cardInHand.suit === Suit.Kreuz && cardInHand.value === CardValue.Dame) {
      player.isRevealed = true;
  }

  state.players[currentPlayerIndex].hand = newHand;
  state.currentTrick = newTrick;
  state.currentPlayerIndex = (currentPlayerIndex + 1) % 4;

  emitToRoom(roomId, 'game_state_update', state);

  if (newTrick.length === 4) {
    setTimeout(() => {
      const winnerIndex = GameEngine.evaluateTrick(state.currentTrick, state.trickStarterIndex, state.gameType, state.trumpSuit, room.settings);
      const trickPoints = GameEngine.calculateTrickPoints(state.currentTrick);

      const winner = state.players[winnerIndex];
      winner.points += trickPoints;
      winner.tricks.push(state.currentTrick);

      // Hochzeit: Find partner in first 3 tricks
      const totalTricksCompleted = state.players.reduce((sum, p) => sum + p.tricks.length, 0);
      if (state.gameType === GameType.Hochzeit && state.rePlayerIds.length === 1) {
          const winner = state.players[winnerIndex];
          if (totalTricksCompleted <= 3) {
              if (!state.rePlayerIds.includes(winner.id)) {
                  state.rePlayerIds.push(winner.id);
                  winner.team = 'Re';
                  winner.isRevealed = true;
              }
          }
          // After 3 tricks, if still alone, they stay alone (team already set to Re)
      }

      // Special Points Evaluation
      const isLastTrick = state.players.every(p => p.hand.length === 0);
      const special = GameEngine.checkTrickSpecialPoints(
          state.currentTrick,
          winnerIndex,
          state.trickStarterIndex,
          state.players,
          room.settings,
          isLastTrick
      );
      state.specialPoints.re.push(...special.re);
      state.specialPoints.kontra.push(...special.kontra);

      state.currentTrick = [];
      state.currentPlayerIndex = winnerIndex;
      state.trickStarterIndex = winnerIndex;

      if (state.players.every(p => p.hand.length === 0)) {
        state.phase = 'Scoring';
        const finalPlayers = GameEngine.revealFinalTeams(state);
        state.players = finalPlayers;

        const finalState = GameEngine.calculateGameResult(state);
        room.gameState = finalState;
        emitToRoom(roomId, 'game_state_update', finalState);
        return; // Don't double emit
      }

      emitToRoom(roomId, 'game_state_update', state);
      
      if (state.phase === 'Playing') {
        handleBotTurns(roomId);
      }
    }, TRICK_EVALUATION_DELAY_MS);
  } else {
    handleBotTurns(roomId);
  }
};

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', ({ playerName, playerId }: { playerName: string, playerId: string }) => {
    // 1. Check Global Limit
    if (Object.keys(rooms).length >= MAX_ROOMS) {
      socket.emit('error', 'Server is full (max 100 rooms)');
      return;
    }

    // 2. Check Rate Limit
    const lastTime = lastRoomCreation.get(socket.id);
    const now = Date.now();
    if (lastTime && (now - lastTime) < CREATE_ROOM_RATE_LIMIT) {
      socket.emit('error', 'You are creating rooms too fast. Please wait.');
      return;
    }

    // 3. Check if already in a room
    let alreadyInRoom = false;
    for (const rid in rooms) {
      if (rooms[rid].players.some(p => p.socketId === socket.id)) {
        alreadyInRoom = true;
        break;
      }
    }
    if (alreadyInRoom) {
      socket.emit('error', 'You are already in a room.');
      return;
    }

    lastRoomCreation.set(socket.id, now);

    const roomId = generateRoomId();
    // Use provided playerId
    rooms[roomId] = {
      id: roomId,
      players: [{
          id: playerId,
          name: playerName.trim(),
          socketId: socket.id,
          ready: true,
          connected: true
      }],
      gameState: null,
      settings: { ...defaultSettings }
    };
    socket.join(roomId);
    socket.emit('room_created', { roomId, players: rooms[roomId].players, settings: rooms[roomId].settings });
  });

  socket.on('join_room', ({ roomId, playerName, playerId }: { roomId: string, playerName: string, playerId: string }) => {
    const error = validatePlayerName(playerName);
    if (error) {
      socket.emit('error', error);
      return;
    }
    const room = rooms[roomId];
    if (room && typeof room !== 'function') {
      const existingPlayer = room.players.find(p => p.id === playerId);
      if (existingPlayer) {
          // Reconnection logic
          existingPlayer.socketId = socket.id;
          existingPlayer.connected = true;
          delete existingPlayer.disconnectTime;

          const timer = disconnectTimeouts.get(playerId);
          if (timer) {
              clearTimeout(timer);
              disconnectTimeouts.delete(playerId);
          }

          socket.join(roomId);
          io.to(roomId).emit('player_joined', room.players);

          socket.emit('joined_room', { roomId, players: room.players, settings: room.settings });
          if (room.gameState) {
             const sanitized = sanitizeState(room.gameState, playerId);
             socket.emit('game_state_update', sanitized);
          }
      } else {
          // New join
          if (room.players.length >= 4) {
            socket.emit('error', 'Room is full');
            return;
          }
          room.players.push({
              id: playerId,
              name: playerName.trim(),
              socketId: socket.id,
              ready: true,
              connected: true
          });
          socket.join(roomId);
          io.to(roomId).emit('player_joined', room.players);
          socket.emit('joined_room', { roomId, players: room.players, settings: room.settings });
      }
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('add_bot', (roomId: string) => {
    const room = rooms[roomId];
    if (room && room.players.length < 4) {
      const botId = `bot-${Math.random().toString(36).substr(2, 5)}`;
      room.players.push({
          id: botId,
          name: `Bot ${room.players.length}`,
          socketId: botId,
          ready: true,
          isBot: true,
          connected: true
      });
      io.to(roomId).emit('player_joined', room.players);
    }
  });

  socket.on('start_game', (roomId: string) => {
    const room = rooms[roomId];
    if (room) {
      // Auto-fill with bots if less than 4
      while (room.players.length < 4) {
        const botId = `bot-${Math.random().toString(36).substr(2, 5)}`;
        room.players.push({
            id: botId,
            name: `Bot ${room.players.length}`,
            socketId: botId,
            ready: true,
            isBot: true,
            connected: true
        });
      }

      const previousState = room.gameState;
      const playerNames = room.players.map(p => p.name);
      const initialState = GameEngine.createInitialState(playerNames, room.settings);
      initialState.phase = 'Bidding';
      
      initialState.players.forEach((p, idx) => {
          const roomPlayer = room.players[idx];
          p.id = roomPlayer.id;
          p.isBot = !!roomPlayer.isBot;
          p.connected = roomPlayer.connected;
          p.disconnectTime = roomPlayer.disconnectTime;

          // Preserve tournament points
          if (previousState) {
              const oldPlayer = previousState.players.find(op => op.id === p.id);
              if (oldPlayer) {
                  p.tournamentPoints = oldPlayer.tournamentPoints;
              }
          }
      });

      const stateWithTeams = GameEngine.determineTeams(initialState);
      room.gameState = stateWithTeams;
      emitToRoom(roomId, 'game_started', stateWithTeams);
      
      // If first player is a bot, start its turn
      if (initialState.phase === 'Bidding') {
          // Bidding for bots
          const checkBids = () => {
              const state = room.gameState!;
              const currentP = state.players[state.currentPlayerIndex];
              if (currentP.isBot && state.phase === 'Bidding') {
                  setTimeout(() => {
                      // In index.ts, we need to handle bidding too
                      handleBotBid(roomId);
                  }, BOT_BID_DELAY_MS);
              }
          };
          checkBids();
      }
    }
  });

  const handleBotBid = (roomId: string) => {
      const room = rooms[roomId];
      if (!room || !room.gameState || room.gameState.phase !== 'Bidding') return;
      const state = room.gameState;
      const currentP = state.players[state.currentPlayerIndex];
      if (currentP.isBot) {
          executeSubmitBid(roomId, currentP.id, 'Gesund');
      }
  };

  const executeSubmitBid = (roomId: string, playerId: string, bid: string) => {
    const room = rooms[roomId];
    if (!room || !room.gameState) return;
    const state = room.gameState;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      console.warn(`Player ${playerId} attempted to bid out of turn. Expected: ${currentPlayer.id}`);
      const playerSocket = room.players.find(p => p.id === playerId);
      if (playerSocket?.socketId) {
        io.to(playerSocket.socketId).emit('error', 'It is not your turn to bid.');
      }
      return;
    }

    state.announcements[playerId] = [bid];

    if (Object.keys(state.announcements).length === 4) {
        const bidsMap: Record<string, string> = {};
        for(const pid in state.announcements) bidsMap[pid] = state.announcements[pid][0];
        const finalType = GameEngine.determineFinalGameType(bidsMap);
        state.gameType = finalType;
        if (['DamenSolo', 'BubenSolo', 'FarbenSolo', 'Fleischlos'].includes(finalType)) {
             const soloPid = Object.keys(bidsMap).find(pid => bidsMap[pid] === finalType);
             state.players.forEach(p => { 
                 p.team = p.id === soloPid ? 'Re' : 'Kontra';
                 p.isRevealed = true; // Everyone knows teams in a Solo
             });
        } else {
             const tempState = GameEngine.determineTeams(state);
             state.rePlayerIds = tempState.rePlayerIds;
             state.kontraPlayerIds = tempState.kontraPlayerIds;
             state.players = tempState.players;
        }
        state.phase = 'Playing';
        state.currentPlayerIndex = (state.dealerIndex + 1) % 4;
        state.trickStarterIndex = state.currentPlayerIndex;
        emitToRoom(roomId, 'game_state_update', state);
        handleBotTurns(roomId);
    } else {
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 4;
        emitToRoom(roomId, 'game_state_update', state);
        if (state.phase === 'Bidding') handleBotBid(roomId);
    }
  };

  socket.on('play_card', ({ roomId, card }: { roomId: string, card: Card }) => {
      // Find player by socket.id
      const room = rooms[roomId];
      if (room) {
          const player = room.players.find(p => p.socketId === socket.id);
          if (player) {
              executePlayCard(roomId, player.id, card);
          }
      }
  });

  socket.on('submit_bid', ({ roomId, bid }: { roomId: string, bid: string }) => {
      const room = rooms[roomId];
      if (room) {
          const player = room.players.find(p => p.socketId === socket.id);
          if (player) {
              executeSubmitBid(roomId, player.id, bid);
          }
      }
  });

  
  socket.on('announce_rekontra', ({ roomId, type }: { roomId: string, type: 'Re' | 'Kontra' }) => {
       const room = rooms[roomId];
       if (!room || !room.gameState) return;
       const state = room.gameState;
       
       const player = room.players.find(p => p.socketId === socket.id);
       if (!player) return;

       state.reKontraAnnouncements[player.id] = type;
       const gamePlayer = state.players.find(p => p.id === player.id);
       if (gamePlayer) gamePlayer.isRevealed = true;
       
       emitToRoom(roomId, 'game_state_update', state);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    lastRoomCreation.delete(socket.id);

    // Remove player from room? 
    // Mark as disconnected.
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
            player.connected = false;
            player.disconnectTime = Date.now();

            // Notify others
            io.to(roomId).emit('player_joined', room.players); // Update lobby list
            if (room.gameState) {
                // If game active, might want to notify via game state too?
                // emitToRoom syncs connection status.
                emitToRoom(roomId, 'game_state_update', room.gameState);
            }

            const timer = setTimeout(() => {
                const currentRoom = rooms[roomId];
                if (!currentRoom) return; // Room might be gone

                // Re-check connection status (use id as socketId might have changed if reconnected but somehow this timer not cleared? Unlikely)
                const p = currentRoom.players.find(pl => pl.id === player.id);
                if (p && !p.connected) {
                    const idx = currentRoom.players.indexOf(p);
                    if (idx !== -1) {
                        currentRoom.players.splice(idx, 1);
                        io.to(roomId).emit('player_left', currentRoom.players);
                        if (currentRoom.players.length === 0) {
                            delete rooms[roomId];
                        }
                    }
                }
                disconnectTimeouts.delete(player.id);
            }, 120000); // 120s

            disconnectTimeouts.set(player.id, timer);
            break;
        }
    }
  });
});

// Handle SPA routing: serve index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

const PORT = process.env.PORT || 5173;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
