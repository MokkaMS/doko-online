import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, GameState, GameSettings, GameType } from '../logic/types';
import { getStoredPlayerId, getStoredRoomId, setStoredRoomId } from '../utils/storage';

const socket: Socket = io({ autoConnect: false });

interface GameContextType {
  state: GameState;
  settings: GameSettings;
  roomId: string | null;
  playCard: (playerId: string, card: Card) => void;
  submitBid: (playerId: string, bid: string) => void;
  announceReKontra: (playerId: string, type: 'Re' | 'Kontra') => void;
  startNewGame: () => void;
  resumeGame: () => void;
  goToMainMenu: () => void;
  setSettings: (settings: GameSettings) => void;
  openSettings: () => void;
  closeSettings: () => void;
  joinGame: (roomId: string, playerName: string) => void;
  createGame: (playerName: string) => void;
  startGameMultiplayer: () => void;
  addBotMultiplayer: () => void;
  playerId: string | null;
}

const defaultSettings: GameSettings = {
  mitNeunen: false,
  dullenAlsHoechste: true,
  schweinchen: false,
  fuchsGefangen: true,
  karlchen: true,
  doppelkopfPunkte: true,
  soloPrioritaet: true,
};

const initialGameState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  currentTrick: [],
  trickStarterIndex: 0,
  trickWinnerIndex: null,
  gameType: GameType.Normal,
  trumpSuit: null,
  rePlayerIds: [],
  kontraPlayerIds: [],
  announcements: {},
  reKontraAnnouncements: {},
  specialPoints: { re: [], kontra: [] },
  notifications: [],
  phase: 'MainMenu',
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [state, setState] = useState<GameState>(initialGameState);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId] = useState<string>(() => getStoredPlayerId());

  useEffect(() => {
    socket.connect();

    socket.on('room_created', ({ roomId, players, settings }: { roomId: string, players: any[], settings: GameSettings }) => {
      setRoomId(roomId);
      setStoredRoomId(roomId);
      setSettings(settings);
      setState(prev => ({ ...prev, phase: 'Lobby', players: players.map(p => ({ ...p, isBot: p.isBot || false, hand: [], tricks: [], points: 0, team: 'Unknown' })) }));
    });

    socket.on('joined_room', ({ roomId, players, settings }: { roomId: string, players: any[], settings: GameSettings }) => {
      setRoomId(roomId);
      setStoredRoomId(roomId);
      setSettings(settings);
      setState(prev => ({ ...prev, phase: 'Lobby', players: players.map(p => ({ ...p, isBot: p.isBot || false, hand: [], tricks: [], points: 0, team: 'Unknown' })) }));
    });

    socket.on('player_joined', (players: any[]) => {
      setState(prev => ({ ...prev, players: players.map(p => ({ ...p, isBot: p.isBot || false, hand: [], tricks: [], points: 0, team: 'Unknown' })) }));
    });

    socket.on('game_started', (gameState: GameState) => {
      setState(gameState);
    });

    socket.on('game_state_update', (newState: GameState) => {
      setState(newState);
    });
    
    socket.on('error', (msg: string) => {
        alert(msg);
    });

    return () => {
      socket.off('room_created');
      socket.off('joined_room');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('game_state_update');
      socket.off('error');
      socket.disconnect();
    };
  }, []);

  const announceReKontra = useCallback((pid: string, type: 'Re' | 'Kontra') => {
    if (roomId) {
        socket.emit('announce_rekontra', { roomId, type });
    }
  }, [roomId]);

  const playCard = useCallback((pid: string, card: Card) => {
    if (roomId) {
        socket.emit('play_card', { roomId, card });
    }
  }, [roomId]);

  const submitBid = useCallback((pid: string, bid: string) => {
    if (roomId) {
        socket.emit('submit_bid', { roomId, bid });
    }
  }, [roomId]);

  const startNewGame = () => {
    if (roomId) {
        socket.emit('start_game', roomId);
    }
  };
  
  const resumeGame = useCallback(() => {
    const storedRoomId = getStoredRoomId();
    if (storedRoomId && playerId) {
        // Attempt reconnection
        if (!socket.connected) socket.connect();
        socket.emit('join_room', { roomId: storedRoomId, playerName: 'Resuming Player', playerId });
    }
  }, [playerId]);

  const goToMainMenu = useCallback(() => {
    if (roomId) {
        socket.disconnect();
        // Do NOT setRoomId(null) in storage.
        setRoomId(null);
    }
    setState(prev => ({ ...prev, phase: 'MainMenu', lastActivePhase: prev.phase as any }));
  }, [roomId]);

  const openSettings = useCallback(() => {
    // Settings are now mostly for game rules which are set on server side by default.
    // We can keep this empty or remove it. Keeping it to satisfy interface for now, or just setting phase if we kept a view.
    // But since we removed SettingsScreen, maybe we don't need this.
    // However, MainMenu.tsx still had openSettings destructured (before I removed it).
    // Let's just do nothing or maybe log.
  }, []);

  const closeSettings = useCallback(() => {
    setState(prev => ({ ...prev, phase: prev.lastActivePhase || 'MainMenu' }));
  }, []);

  const joinGame = (rid: string, pname: string) => {
      socket.emit('join_room', { roomId: rid, playerName: pname, playerId });
  };

  const createGame = (pname: string) => {
      socket.emit('create_room', { playerName: pname, playerId });
  };

  const startGameMultiplayer = () => {
      if (roomId) socket.emit('start_game', roomId);
  };

  const addBotMultiplayer = () => {
      if (roomId) socket.emit('add_bot', roomId);
  };

  return (
    <GameContext.Provider value={{ state, settings, roomId, playerId, playCard, submitBid, announceReKontra, startNewGame, resumeGame, goToMainMenu, setSettings, openSettings, closeSettings, joinGame, createGame, startGameMultiplayer, addBotMultiplayer }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
