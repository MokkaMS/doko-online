import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, GameState, GameSettings, GameType, Player } from '../logic/types';
import { getStoredPlayerId, getStoredRoomId, setStoredRoomId, getStoredPlayerName, setStoredPlayerName } from '../utils/storage';

const socket: Socket = io({ autoConnect: false });

export interface PublicRoom {
    id: string;
    playerCount: number;
    hostName: string;
}

interface GameContextType {
  state: GameState;
  settings: GameSettings;
  roomId: string | null;
  hostId: string | null;
  isPublic: boolean;
  publicRooms: PublicRoom[];
  playCard: (playerId: string, card: Card) => void;
  submitBid: (playerId: string, bid: string) => void;
  announceReKontra: (playerId: string, type: 'Re' | 'Kontra') => void;
  startNewGame: () => void;
  resumeGame: () => void;
  reconnect: () => void;
  goToMainMenu: () => void;
  setSettings: (settings: GameSettings) => void;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  openSettings: () => void;
  closeSettings: () => void;
  joinGame: (roomId: string, playerName: string) => void;
  createGame: (playerName: string) => void;
  startGameMultiplayer: () => void;
  addBotMultiplayer: () => void;
  togglePublic: () => void;
  kickPlayer: (targetId: string) => void;
  refreshPublicRooms: () => void;
  updateBotName: (botId: string, newName: string) => void;
  playerId: string | null;
}

const defaultSettings: GameSettings = {
  mitNeunen: false,
  dullenAlsHoechste: true,
  schweinchen: false,
  fuchsGefangen: true,
  karlchen: true,
  karlchenGefangen: true,
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
  currentTrickNotifications: [],
  phase: 'MainMenu',
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [state, setState] = useState<GameState>(initialGameState);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [playerId] = useState<string>(() => getStoredPlayerId());
  const [lastRoomId, setLastRoomId] = useState<string | null>(null);

  useEffect(() => {
    socket.connect();

    const storedRoomId = getStoredRoomId();
    const storedPlayerName = getStoredPlayerName();

    if (storedRoomId && playerId) {
      socket.emit('join_room', {
        roomId: storedRoomId,
        playerName: storedPlayerName || 'Player',
        playerId
      });
    }

    const handleConnect = () => {
      const rid = getStoredRoomId();
      const pname = getStoredPlayerName();
      if (rid && playerId) {
        console.log('Reconnecting to room:', rid);
        socket.emit('join_room', {
          roomId: rid,
          playerName: pname || 'Player',
          playerId
        });
      }
    };

    socket.on('connect', handleConnect);

    socket.on('room_created', ({ roomId, players, settings, hostId, isPublic }: { roomId: string, players: Partial<Player>[], settings: GameSettings, hostId: string, isPublic: boolean }) => {
      setRoomId(roomId);
      setStoredRoomId(roomId);
      setSettings(settings);
      setHostId(hostId);
      setIsPublic(isPublic);
      setState(prev => ({ ...prev, phase: 'Lobby', players: players.map(p => ({ ...p, isBot: p.isBot || false, hand: [], tricks: [], points: 0, team: 'Unknown' })) as Player[] }));
    });

    socket.on('joined_room', ({ roomId, players, settings, hostId, isPublic }: { roomId: string, players: Partial<Player>[], settings: GameSettings, hostId: string, isPublic: boolean }) => {
      setRoomId(roomId);
      setStoredRoomId(roomId);
      setSettings(settings);
      setHostId(hostId);
      setIsPublic(isPublic);
      setState(prev => ({ ...prev, phase: 'Lobby', players: players.map(p => ({ ...p, isBot: p.isBot || false, hand: [], tricks: [], points: 0, team: 'Unknown' })) as Player[] }));
    });

    socket.on('player_joined', (players: Partial<Player>[]) => {
      setState(prev => ({ ...prev, players: players.map(p => ({ ...p, isBot: p.isBot || false, hand: [], tricks: [], points: 0, team: 'Unknown' })) as Player[] }));
    });

    socket.on('room_update', (data: { hostId?: string, isPublic?: boolean }) => {
        if (data.hostId) setHostId(data.hostId);
        if (data.isPublic !== undefined) setIsPublic(data.isPublic);
    });

    socket.on('kicked', () => {
        alert('Du wurdest aus dem Raum entfernt.');
        setRoomId(null);
        setStoredRoomId(null);
        setHostId(null);
        setState(() => ({ ...initialGameState, phase: 'MainMenu' }));
    });

    socket.on('public_rooms_list', (rooms: PublicRoom[]) => {
        setPublicRooms(rooms);
    });

    socket.on('game_started', (gameState: GameState) => {
      setState(gameState);
    });

    socket.on('game_state_update', (newState: GameState) => {
      setState(newState);
    });
    
    socket.on('settings_updated', (newSettings: GameSettings) => {
        setSettings(newSettings);
    });

    socket.on('error', (msg: string) => {
        if (msg === 'Room not found') {
            setStoredRoomId(null);
        }
        alert(msg);
    });

    return () => {
      socket.off('room_created');
      socket.off('settings_updated');
      socket.off('joined_room');
      socket.off('player_joined');
      socket.off('room_update');
      socket.off('kicked');
      socket.off('public_rooms_list');
      socket.off('game_started');
      socket.off('game_state_update');
      socket.off('error');
      socket.off('connect', handleConnect);
      socket.disconnect();
    };
  }, [playerId]);

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
    const roomIdToUse = getStoredRoomId() || lastRoomId;
    if (roomIdToUse && playerId) {
        // Attempt reconnection
        if (!socket.connected) socket.connect();
        socket.emit('join_room', { roomId: roomIdToUse, playerName: 'Resuming Player', playerId });
        setStoredRoomId(roomIdToUse);
    }
  }, [playerId, lastRoomId]);

  const reconnect = useCallback(() => {
      socket.disconnect();
      socket.connect();
  }, []);

  const updateSettings = useCallback((newSettings: Partial<GameSettings>) => {
      if (roomId) {
          socket.emit('update_settings', { roomId, settings: newSettings });
      }
  }, [roomId]);

  const goToMainMenu = useCallback(() => {
    if (roomId) {
        setLastRoomId(roomId);
        socket.emit('leave_room', { roomId });
        setStoredRoomId(null);
        setRoomId(null);
        setHostId(null);
    }
    setState(prev => ({
        ...prev,
        phase: 'MainMenu',
        lastActivePhase: (prev.phase === 'Bidding' || prev.phase === 'Playing' || prev.phase === 'Scoring') ? prev.phase : undefined
    }));
  }, [roomId]);

  const openSettings = useCallback(() => {
    // Settings are now mostly for game rules which are set on server side by default.
  }, []);

  const closeSettings = useCallback(() => {
    setState(prev => ({ ...prev, phase: prev.lastActivePhase || 'MainMenu' }));
  }, []);

  const joinGame = (rid: string, pname: string) => {
      setStoredPlayerName(pname);
      if (!socket.connected) socket.connect();
      socket.emit('join_room', { roomId: rid, playerName: pname, playerId });
  };

  const createGame = (pname: string) => {
      setStoredPlayerName(pname);
      if (!socket.connected) socket.connect();
      socket.emit('create_room', { playerName: pname, playerId });
  };

  const startGameMultiplayer = () => {
      if (roomId) socket.emit('start_game', roomId);
  };

  const addBotMultiplayer = () => {
      if (roomId) socket.emit('add_bot', roomId);
  };

  const togglePublic = useCallback(() => {
      if (roomId) socket.emit('toggle_public', { roomId });
  }, [roomId]);

  const kickPlayer = useCallback((targetId: string) => {
      if (roomId) socket.emit('kick_player', { roomId, targetId });
  }, [roomId]);

  const updateBotName = useCallback((botId: string, newName: string) => {
      if (roomId) socket.emit('update_bot_name', { roomId, botId, newName });
  }, [roomId]);

  const refreshPublicRooms = useCallback(() => {
      if (!socket.connected) socket.connect();
      socket.emit('get_public_rooms');
  }, []);

  return (
    <GameContext.Provider value={{
        state,
        settings,
        roomId,
        hostId,
        isPublic,
        publicRooms,
        playerId,
        playCard,
        submitBid,
        announceReKontra,
        startNewGame,
        resumeGame,
        reconnect,
        goToMainMenu,
        setSettings,
        updateSettings,
        openSettings,
        closeSettings,
        joinGame,
        createGame,
        startGameMultiplayer,
        addBotMultiplayer,
        togglePublic,
        kickPlayer,
        refreshPublicRooms,
        updateBotName
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
