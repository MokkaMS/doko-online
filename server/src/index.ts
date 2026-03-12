import express from 'express';
import http from 'http';
import path from 'path';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';
import { GameEngine } from './logic/GameEngine';
import { GameState, Card, GameSettings, GameType, Suit, CardValue } from './logic/types';
import { Bot } from './logic/Bot';
import { validatePlayerName, validateRoomId, validatePlayerId } from './utils/validation';
import {
  MAX_ROOMS,
  CREATE_ROOM_RATE_LIMIT,
  BOT_TURN_DELAY_MS,
  BOT_BID_DELAY_MS,
  TRICK_EVALUATION_DELAY_MS,
  PLAYER_ACTION_DEBOUNCE_MS,
  DISCONNECT_TIMEOUT_MS
} from './config/constants';

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
  hostId: string;
  isPublic: boolean;
}

const rooms: Record<string, Room> = Object.create(null);
const socketToPlayerMap = new Map<string, { roomId: string, playerId: string }>();
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

const lastRoomCreation: Map<string, number> = new Map();
const lastPlayerActionTime: Map<string, number> = new Map();

const addPlayerToMap = (socketId: string, roomId: string, playerId: string) => {
  socketToPlayerMap.set(socketId, { roomId, playerId });
};

const removePlayerFromMap = (socketId: string) => {
  socketToPlayerMap.delete(socketId);
};

// Helper to generate room ID
const generateRoomId = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
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

  // Let bots decide if they want to announce Re or Kontra before someone plays a card
  for (const p of state.players) {
    if (p.isBot) {
      const announcement = Bot.decideAnnouncement(p, state, room.settings);
      if (announcement) {
        if (announcement === 'Re' && state.rePlayerIds.includes(p.id)) {
           state.reKontraAnnouncements[p.id] = 'Re';
           state.notifications.push({ id: Date.now() + Math.random(), text: `${p.name} sagt Re!` });
           io.to(roomId).emit('game_state_update', state);
        } else if (announcement === 'Kontra' && state.kontraPlayerIds.includes(p.id)) {
           state.reKontraAnnouncements[p.id] = 'Kontra';
           state.notifications.push({ id: Date.now() + Math.random(), text: `${p.name} sagt Kontra!` });
           io.to(roomId).emit('game_state_update', state);
        }
      }
    }
  }

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

  // Prevent playing into a full trick (waiting for evaluation)
  if (state.currentTrick.length >= 4) {
    return;
  }

  // Debounce player actions
  const now = Date.now();
  const lastTime = lastPlayerActionTime.get(playerId);
  if (lastTime && (now - lastTime) < PLAYER_ACTION_DEBOUNCE_MS) {
    return;
  }
  lastPlayerActionTime.set(playerId, now);

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

  GameEngine.checkAndRevealRemainingPlayers(state);

  state.players[currentPlayerIndex].hand = newHand;
  state.currentTrick = newTrick;
  state.currentPlayerIndex = (currentPlayerIndex + 1) % 4;

  if (newTrick.length === 4) {
    // Determine winner immediately for animation
    state.trickWinnerIndex = GameEngine.evaluateTrick(state.currentTrick, state.trickStarterIndex, state.gameType, state.trumpSuit, room.settings);

    // Evaluate Special Points IMMEDIATELY to populate notifications
    const isLastTrick = state.players.every(p => p.hand.length === 0);
    const special = GameEngine.checkTrickSpecialPoints(
      state.currentTrick,
      state.trickWinnerIndex,
      state.trickStarterIndex,
      state.players,
      room.settings,
      isLastTrick
    );
    state.currentTrickNotifications = special.notifications;
  } else {
    state.currentTrickNotifications = [];
  }

  emitToRoom(roomId, 'game_state_update', state);

  if (newTrick.length === 4) {
    setTimeout(() => {
      const winnerIndex = state.trickWinnerIndex !== null ? state.trickWinnerIndex : GameEngine.evaluateTrick(state.currentTrick, state.trickStarterIndex, state.gameType, state.trumpSuit, room.settings);
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
            state.kontraPlayerIds = state.kontraPlayerIds.filter(id => id !== winner.id);
            winner.team = 'Re';
            winner.isRevealed = true;
          }
        }
        // After 3 tricks, if still alone, they stay alone (team already set to Re)
      }

      GameEngine.checkAndRevealRemainingPlayers(state);

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
      state.trickWinnerIndex = null;
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
    console.log(`[create_room] Request from ${playerName} (${playerId})`);

    const nameError = validatePlayerName(playerName);
    if (nameError) {
      socket.emit('error', nameError);
      return;
    }

    const idError = validatePlayerId(playerId);
    if (idError) {
      socket.emit('error', idError);
      return;
    }

    // 1. Check Global Limit
    if (Object.keys(rooms).length >= MAX_ROOMS) {
      socket.emit('error', `Server is full (max ${MAX_ROOMS} rooms)`);
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
    if (socketToPlayerMap.has(socket.id)) {
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
      settings: { ...defaultSettings },
      hostId: playerId,
      isPublic: false
    };
    addPlayerToMap(socket.id, roomId, playerId);
    socket.join(roomId);
    socket.emit('room_created', {
      roomId,
      players: rooms[roomId].players,
      settings: rooms[roomId].settings,
      hostId: rooms[roomId].hostId,
      isPublic: rooms[roomId].isPublic
    });
    io.emit('public_rooms_update', getPublicRooms());
    console.log(`[create_room] Room ${roomId} created by ${playerName}`);
  });

  socket.on('leave_room', ({ roomId }: { roomId: string }) => {
    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

    const room = rooms[roomId];
    if (room) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        // Remove player
        const idx = room.players.indexOf(player);
        if (idx !== -1) {
          room.players.splice(idx, 1);
        }
        removePlayerFromMap(socket.id);

        // Clear disconnect timeout if exists
        const timer = disconnectTimeouts.get(player.id);
        if (timer) {
          clearTimeout(timer);
          disconnectTimeouts.delete(player.id);
        }

        socket.leave(roomId);

        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          // Transfer host if needed
          if (room.hostId === player.id) {
            const nextHost = room.players.find(p => !p.isBot && p.connected);
            if (nextHost) {
              room.hostId = nextHost.id;
              io.to(roomId).emit('room_update', { hostId: room.hostId, isPublic: room.isPublic });
            }
          }

          io.to(roomId).emit('player_left', room.players);
          io.to(roomId).emit('player_joined', room.players); // Update lists
        }

        socket.emit('left_room');
      }
    }
  });

  socket.on('join_room', ({ roomId, playerName, playerId }: { roomId: string, playerName: string, playerId: string }) => {
    console.log(`[join_room] Request from ${playerName} (${playerId}) to join ${roomId}`);

    const nameError = validatePlayerName(playerName);
    if (nameError) {
      socket.emit('error', nameError);
      return;
    }

    const idError = validatePlayerId(playerId);
    if (idError) {
      socket.emit('error', idError);
      return;
    }

    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

    const room = rooms[roomId];
    if (room && typeof room !== 'function') {
      let existingPlayer = room.players.find(p => p.id === playerId);
      let isReturningPlayer = false;

      // If not in room.players but in gameState, treat as reconnecting to an active game
      if (!existingPlayer && room.gameState) {
        const playerInGame = room.gameState.players.find(p => p.id === playerId);
        if (playerInGame) {
          isReturningPlayer = true;
          existingPlayer = {
            id: playerId,
            name: playerName.trim(),
            socketId: socket.id,
            ready: true,
            connected: true
          };
          room.players.push(existingPlayer);
        }
      }

      if (existingPlayer) {
        // Reconnection logic
        const oldSocketId = existingPlayer.socketId;
        if (oldSocketId && oldSocketId !== socket.id) {
          removePlayerFromMap(oldSocketId);
        }
        existingPlayer.socketId = socket.id;
        existingPlayer.connected = true;
        delete existingPlayer.disconnectTime;
        addPlayerToMap(socket.id, roomId, playerId);

        const timer = disconnectTimeouts.get(playerId);
        if (timer) {
          clearTimeout(timer);
          disconnectTimeouts.delete(playerId);
        }

        socket.join(roomId);

        io.to(roomId).emit('player_joined', room.players);

        socket.emit('joined_room', {
          roomId,
          players: room.players,
          settings: room.settings,
          hostId: room.hostId,
          isPublic: room.isPublic
        });

        if (room.gameState) {
          const sanitized = sanitizeState(room.gameState, playerId);
          socket.emit('game_state_update', sanitized);
          // Inform others to sync the connection status visually
          emitToRoom(roomId, 'game_state_update', room.gameState);
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
        addPlayerToMap(socket.id, roomId, playerId);
        socket.join(roomId);
        console.log(`[join_room] ${playerName} joined ${roomId}. Players: ${room.players.map(p => p.name).join(', ')}`);

        io.to(roomId).emit('player_joined', room.players);

        socket.emit('joined_room', {
          roomId,
          players: room.players,
          settings: room.settings,
          hostId: room.hostId,
          isPublic: room.isPublic
        });
      }
    } else {
      console.log(`[join_room] Room ${roomId} not found for ${playerName}`);
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('add_bot', (roomId: string) => {
    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

    const room = rooms[roomId];
    if (room) {
      // Validate host
      const requester = room.players.find(p => p.socketId === socket.id);
      if (!requester || requester.id !== room.hostId) {
        socket.emit('error', 'Only the host can add bots.');
        return;
      }

      if (room.players.length < 4) {
        const botId = `bot-${crypto.randomBytes(4).toString('hex')}`;
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
    }
  });

  socket.on('start_game', (roomId: string) => {
    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

    const room = rooms[roomId];
    if (room) {
      // Validate host
      const requester = room.players.find(p => p.socketId === socket.id);
      if (!requester || requester.id !== room.hostId) {
        socket.emit('error', 'Only the host can start the game.');
        return;
      }

      // Auto-fill with bots if less than 4
      while (room.players.length < 4) {
        const botId = `bot-${crypto.randomBytes(4).toString('hex')}`;
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

      // When game starts, it's no longer a public "lobby" effectively, but we can keep isPublic flag true.
      // The filter for public lobbies will check gameState === null.

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

  socket.on('toggle_public', ({ roomId }: { roomId: string }) => {
    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

    const room = rooms[roomId];
    if (room) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player && room.hostId === player.id) {
        room.isPublic = !room.isPublic;
        console.log(`[toggle_public] Room ${roomId} is now ${room.isPublic ? 'Public' : 'Private'}`);
        io.to(roomId).emit('room_update', { hostId: room.hostId, isPublic: room.isPublic });
        io.emit('public_rooms_update', getPublicRooms());
      } else {
        console.log(`[toggle_public] Failed: User is not host or not in room. Host: ${room.hostId}, Requester: ${player?.id}`);
      }
    } else {
      console.log(`[toggle_public] Room ${roomId} not found`);
    }
  });

  socket.on('kick_player', ({ roomId, targetId }: { roomId: string, targetId: string }) => {
    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

    const targetIdError = validatePlayerId(targetId);
    if (targetIdError) {
      socket.emit('error', targetIdError);
      return;
    }

    const room = rooms[roomId];
    if (!room) return;

    const requester = room.players.find(p => p.socketId === socket.id);
    if (!requester || requester.id !== room.hostId) {
      socket.emit('error', 'Only the host can kick players.');
      return;
    }

    if (targetId === requester.id) {
      socket.emit('error', 'You cannot kick yourself.');
      return;
    }

    const targetPlayer = room.players.find(p => p.id === targetId);
    if (!targetPlayer) return;

    if (targetPlayer.isBot) {
      // Remove bot
      const idx = room.players.indexOf(targetPlayer);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(roomId).emit('player_left', room.players);
        io.to(roomId).emit('player_joined', room.players);
      }
    } else {
      // Kick human
      const idx = room.players.indexOf(targetPlayer);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        // Notify the kicked player
        if (targetPlayer.socketId) {
          removePlayerFromMap(targetPlayer.socketId);
          io.to(targetPlayer.socketId).emit('kicked');
          // Force disconnect logic
          const socketToKick = io.sockets.sockets.get(targetPlayer.socketId);
          if (socketToKick) {
            socketToKick.leave(roomId);
          }
        }
        io.to(roomId).emit('player_left', room.players);
        io.to(roomId).emit('player_joined', room.players);
      }
    }
  });

  socket.on('get_public_rooms', () => {
    const publicRooms = getPublicRooms();
    socket.emit('public_rooms_list', publicRooms);
  });

  const getPublicRooms = () => {
    return Object.values(rooms)
      .filter(r => r.isPublic && r.gameState === null && r.players.length < 4)
      .map(r => ({
        id: r.id,
        playerCount: r.players.length,
        hostName: r.players.find(p => p.id === r.hostId)?.name || 'Unknown'
      }));
  };

  const handleBotBid = (roomId: string) => {
    const room = rooms[roomId];
    if (!room || !room.gameState || room.gameState.phase !== 'Bidding') return;
    const state = room.gameState;
    const currentP = state.players[state.currentPlayerIndex];
    if (currentP.isBot) {
      const bid = Bot.evaluateHandForBid(currentP, room.settings);
      executeSubmitBid(roomId, currentP.id, bid);
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
      for (const pid in state.announcements) bidsMap[pid] = state.announcements[pid][0];

      // Determine player order starting from Forehand (Dealer + 1)
      const playerIdsInOrder = [];
      let pIndex = (state.dealerIndex + 1) % 4;
      for (let i = 0; i < 4; i++) {
        playerIdsInOrder.push(state.players[pIndex].id);
        pIndex = (pIndex + 1) % 4;
      }

      const { gameType: finalType, trumpSuit, soloPlayerId } = GameEngine.determineFinalGameType(bidsMap, playerIdsInOrder);
      state.gameType = finalType;
      state.trumpSuit = trumpSuit;

      if (['DamenSolo', 'BubenSolo', 'FarbenSolo', 'Fleischlos'].includes(finalType)) {
        // Use soloPlayerId to set teams
        if (soloPlayerId) {
          state.rePlayerIds = [soloPlayerId];
          state.kontraPlayerIds = state.players.filter(p => p.id !== soloPlayerId).map(p => p.id);
          state.players.forEach(p => {
            p.team = p.id === soloPlayerId ? 'Re' : 'Kontra';
            p.isRevealed = true; // Everyone knows teams in a Solo
          });
        }
      } else {
        const tempState = GameEngine.determineTeams(state);
        state.rePlayerIds = tempState.rePlayerIds;
        state.kontraPlayerIds = tempState.kontraPlayerIds;
        state.players = tempState.players;

        if (finalType === GameType.Hochzeit) {
          state.players.forEach(p => {
            if (state.rePlayerIds.includes(p.id)) {
              p.isRevealed = true;
            }
          });
        }
      }
      state.phase = 'Playing';
      state.currentPlayerIndex = GameEngine.determineStartingPlayerIndex(finalType, state.dealerIndex, soloPlayerId, state.players);
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
    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

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
    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

    const room = rooms[roomId];
    if (room) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        executeSubmitBid(roomId, player.id, bid);
      }
    }
  });


  socket.on('announce_rekontra', ({ roomId, type }: { roomId: string, type: 'Re' | 'Kontra' }) => {
    const roomIdError = validateRoomId(roomId);
    if (roomIdError) {
      socket.emit('error', roomIdError);
      return;
    }

    const room = rooms[roomId];
    if (!room || !room.gameState) return;
    const state = room.gameState;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    const gamePlayer = state.players.find(p => p.id === player.id);
    if (!gamePlayer) return;

    // 1. Validate Team
    if (type === 'Re' && !state.rePlayerIds.includes(player.id)) {
      socket.emit('error', 'You can only announce Re if you are on the Re team.');
      return;
    }
    if (type === 'Kontra' && !state.kontraPlayerIds.includes(player.id)) {
      socket.emit('error', 'You can only announce Kontra if you are on the Kontra team.');
      return;
    }

    // 2. Validate Timing (Before playing 2nd card)
    const initialHandSize = room.settings.mitNeunen ? 12 : 10;
    const cardsPlayed = initialHandSize - gamePlayer.hand.length;
    if (cardsPlayed >= 2) {
      socket.emit('error', 'Announcements are only allowed before you play your second card.');
      return;
    }

    state.reKontraAnnouncements[player.id] = type;
    gamePlayer.isRevealed = true;

    GameEngine.checkAndRevealRemainingPlayers(state);

    emitToRoom(roomId, 'game_state_update', state);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    lastRoomCreation.delete(socket.id);

    // Remove player from room? 
    // Mark as disconnected.
    const mapping = socketToPlayerMap.get(socket.id);
    if (mapping) {
      const { roomId, playerId } = mapping;
      const room = rooms[roomId];
      const player = room?.players.find(p => p.id === playerId);
      if (player && player.socketId === socket.id) {
        player.connected = false;
        player.disconnectTime = Date.now();

        // Notify others
        io.to(roomId).emit('player_joined', room.players); // Update lobby list
        if (room.gameState) {
          // If game active, might want to notify via game state too?
          // emitToRoom syncs connection status.
          emitToRoom(roomId, 'game_state_update', room.gameState);
        }

        // Transfer host immediately if host disconnected
        if (room.hostId === player.id) {
          const nextHost = room.players.find(p => !p.isBot && p.connected);
          if (nextHost) {
            room.hostId = nextHost.id;
            io.to(roomId).emit('room_update', { hostId: room.hostId, isPublic: room.isPublic });
          }
        }

        const timer = setTimeout(() => {
          const currentRoom = rooms[roomId];
          if (!currentRoom) return; // Room might be gone

          // Re-check connection status (use id as socketId might have changed if reconnected but somehow this timer not cleared? Unlikely)
          const p = currentRoom.players.find(pl => pl.id === player.id);
          if (p && !p.connected) {
            const idx = currentRoom.players.indexOf(p);
            if (idx !== -1) {
              if (p.socketId) removePlayerFromMap(p.socketId);
              currentRoom.players.splice(idx, 1);
              io.to(roomId).emit('player_left', currentRoom.players);

              // Check empty room
              if (currentRoom.players.length === 0) {
                delete rooms[roomId];
              } else {
                // Transfer host again if needed (e.g. if the "acting host" also timed out)
                if (currentRoom.hostId === player.id) {
                  const nextHost = currentRoom.players.find(pl => !pl.isBot && pl.connected);
                  if (nextHost) {
                    currentRoom.hostId = nextHost.id;
                    io.to(roomId).emit('room_update', { hostId: currentRoom.hostId, isPublic: currentRoom.isPublic });
                  }
                }
              }
            }
          }
          disconnectTimeouts.delete(player.id);
        }, DISCONNECT_TIMEOUT_MS);

        disconnectTimeouts.set(player.id, timer);
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
