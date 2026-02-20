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
app.use(cors());

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../../dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

interface Room {
  id: string;
  players: { id: string; name: string; socketId: string; ready: boolean; isBot?: boolean }[];
  gameState: GameState | null;
  settings: GameSettings;
}

const rooms: Record<string, Room> = Object.create(null);

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

  room.players.forEach(p => {
    if (!p.isBot && p.socketId) {
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

      state.currentTrick = [];
      state.currentPlayerIndex = winnerIndex;
      state.trickStarterIndex = winnerIndex;

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

      if (state.players.every(p => p.hand.length === 0)) {
        state.phase = 'Scoring';
        const finalPlayers = GameEngine.revealFinalTeams(state);
        state.players = finalPlayers;
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

  socket.on('create_room', (playerName: string) => {
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
    rooms[roomId] = {
      id: roomId,
      players: [{ id: socket.id, name: playerName.trim(), socketId: socket.id, ready: true }],
      gameState: null,
      settings: { ...defaultSettings }
    };
    socket.join(roomId);
    socket.emit('room_created', { roomId, players: rooms[roomId].players, settings: rooms[roomId].settings });
  });

  socket.on('join_room', ({ roomId, playerName }: { roomId: string, playerName: string }) => {
    const error = validatePlayerName(playerName);
    if (error) {
      socket.emit('error', error);
      return;
    }
    const room = rooms[roomId];
    if (room && typeof room !== 'function') {
      if (room.players.length >= 4) {
        socket.emit('error', 'Room is full');
        return;
      }
      room.players.push({ id: socket.id, name: playerName.trim(), socketId: socket.id, ready: true });
      socket.join(roomId);
      io.to(roomId).emit('player_joined', room.players);
      socket.emit('joined_room', { roomId, players: room.players, settings: room.settings });
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('add_bot', (roomId: string) => {
    const room = rooms[roomId];
    if (room && room.players.length < 4) {
      const botId = `bot-${Math.random().toString(36).substr(2, 5)}`;
      room.players.push({ id: botId, name: `Bot ${room.players.length}`, socketId: botId, ready: true, isBot: true });
      io.to(roomId).emit('player_joined', room.players);
    }
  });

  socket.on('start_game', (roomId: string) => {
    const room = rooms[roomId];
    if (room) {
      // Auto-fill with bots if less than 4
      while (room.players.length < 4) {
        const botId = `bot-${Math.random().toString(36).substr(2, 5)}`;
        room.players.push({ id: botId, name: `Bot ${room.players.length}`, socketId: botId, ready: true, isBot: true });
      }

      const playerNames = room.players.map(p => p.name);
      const initialState = GameEngine.createInitialState(playerNames, room.settings);
      initialState.phase = 'Bidding';
      
      initialState.players.forEach((p, idx) => {
          const roomPlayer = room.players[idx];
          p.id = roomPlayer.id;
          p.isBot = !!roomPlayer.isBot;
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
      executePlayCard(roomId, socket.id, card);
  });

  socket.on('submit_bid', ({ roomId, bid }: { roomId: string, bid: string }) => {
      executeSubmitBid(roomId, socket.id, bid);
  });

  
  socket.on('announce_rekontra', ({ roomId, type }: { roomId: string, type: 'Re' | 'Kontra' }) => {
       const room = rooms[roomId];
       if (!room || !room.gameState) return;
       const state = room.gameState;
       
       state.reKontraAnnouncements[socket.id] = type;
       const player = state.players.find(p => p.id === socket.id);
       if (player) player.isRevealed = true;
       
       emitToRoom(roomId, 'game_state_update', state);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    lastRoomCreation.delete(socket.id);

    // Remove player from room? 
    // Ideally yes, or mark as disconnected.
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIdx = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIdx !== -1) {
            room.players.splice(playerIdx, 1);
            io.to(roomId).emit('player_left', room.players);
            if (room.players.length === 0) {
                delete rooms[roomId];
            }
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
