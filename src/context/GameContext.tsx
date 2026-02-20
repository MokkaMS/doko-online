import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, GameState, Player, GameSettings, GameType, Suit, CardValue, GameEngine, Bot } from '@doppelkopf/game-logic';

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

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [state, setState] = useState<GameState>(() => GameEngine.createInitialState(['Du', 'Bot 1', 'Bot 2', 'Bot 3'], defaultSettings));
  const [isCleaning, setIsCleaning] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    socket.connect();

    socket.on('room_created', ({ roomId, players, settings }: { roomId: string, players: any[], settings: GameSettings }) => {
      setRoomId(roomId);
      setSettings(settings);
      // Update local lobby state? Or wait for 'game_started'?
      // We can use a special 'Lobby' state.
      setState(prev => ({ ...prev, phase: 'Lobby', players: players.map(p => ({ ...p, isBot: p.isBot || false, hand: [], tricks: [], points: 0, team: 'Unknown' })) }));
    });

    socket.on('joined_room', ({ roomId, players, settings }: { roomId: string, players: any[], settings: GameSettings }) => {
      setRoomId(roomId);
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
        return;
    }
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === pid ? { ...p, isRevealed: true } : p),
      reKontraAnnouncements: { ...prev.reKontraAnnouncements, [pid]: type }
    }));
  }, [roomId]);

  const playCard = useCallback((pid: string, card: Card) => {
    if (roomId) {
        socket.emit('play_card', { roomId, card });
        return;
    }
    if (state.phase !== 'Playing') return;
    if (isCleaning) return;
    setState(prevState => {
      const currentPlayerIndex = prevState.currentPlayerIndex;
      const currentPlayer = prevState.players[currentPlayerIndex];
      if (currentPlayer.id !== pid) return prevState;

      if (!GameEngine.isValidMove(card, currentPlayer, prevState.currentTrick, prevState.gameType, prevState.trumpSuit, settings)) return prevState;

      const newHand = currentPlayer.hand.filter(c => c.id !== card.id);
      const newTrick = [...prevState.currentTrick, card];
      const isKreuzDame = card.suit === Suit.Kreuz && card.value === CardValue.Dame;
      
      const updatedPlayers = prevState.players.map(p => {
        if (p.id === pid) {
          const updatedP = { ...p, hand: newHand };
          if (isKreuzDame) {
              updatedP.team = 'Re';
              updatedP.isRevealed = true;
          }
          return updatedP;
        }
        return p;
      });

      if (newTrick.length === 4) setIsCleaning(true);

      return {
        ...prevState,
        players: updatedPlayers,
        currentTrick: newTrick,
        currentPlayerIndex: (currentPlayerIndex + 1) % 4,
      };
    });
  }, [settings, isCleaning, roomId]);

  // ... (addNotification logic removed as requested previously) ...

  useEffect(() => {
    if (!roomId && state.currentTrick.length === 4 && isCleaning) {
      // Local cleaning logic
      const timer = setTimeout(() => {
        setState(prevState => {
          const winnerIndex = GameEngine.evaluateTrick(prevState.currentTrick, prevState.trickStarterIndex, prevState.gameType, prevState.trumpSuit, settings);
          const trickPoints = GameEngine.calculateTrickPoints(prevState.currentTrick);
          
          let updatedPlayers = prevState.players.map((p, idx) => 
            idx === winnerIndex ? { ...p, points: p.points + trickPoints, tricks: [...p.tricks, prevState.currentTrick] } : p
          );

          const winner = updatedPlayers[winnerIndex];
          const winnersTeam = prevState.rePlayerIds.includes(winner.id) ? 're' : 'kontra';
          const losersTeam = winnersTeam === 're' ? 'kontra' : 're';
          
          const newSpecialPoints = { ...prevState.specialPoints };

          // 1. Fuchs gefangen? (Karo Ass)
          prevState.currentTrick.forEach((card, i) => {
            if (card.suit === Suit.Karo && card.value === CardValue.Ass) {
              const cardOwnerIndex = (prevState.trickStarterIndex + i) % 4;
              const cardOwnerId = prevState.players[cardOwnerIndex].id;
              const ownerTeam = prevState.rePlayerIds.includes(cardOwnerId) ? 're' : 'kontra';
              
              if (ownerTeam !== winnersTeam && settings.fuchsGefangen) {
                newSpecialPoints[winnersTeam].push('Fuchs gefangen');
              }
            }
          });

          // 2. Doppelkopf? (>= 40 Punkte)
          if (trickPoints >= 40 && settings.doppelkopfPunkte) {
            newSpecialPoints[winnersTeam].push('Doppelkopf');
          }

          // 3. Karlchen am End? (Letzter Stich mit Kreuz Bube)
          const isLastTrick = updatedPlayers.every(p => p.hand.length === 0);
          if (isLastTrick && settings.karlchen) {
             const winnersCard = prevState.currentTrick[(winnerIndex - prevState.trickStarterIndex + 4) % 4];
             if (winnersCard.suit === Suit.Kreuz && winnersCard.value === CardValue.Bube) {
                newSpecialPoints[winnersTeam].push('Karlchen am End');
             }
          }

          // Hochzeit: Find partner in first 3 tricks
          const totalTricksCompleted = updatedPlayers.reduce((sum, p) => sum + p.tricks.length, 0);
          if (prevState.gameType === GameType.Hochzeit && prevState.rePlayerIds.length === 1) {
              if (totalTricksCompleted <= 3) {
                  if (!prevState.rePlayerIds.includes(winner.id)) {
                      updatedPlayers = updatedPlayers.map((p, idx) => idx === winnerIndex ? { ...p, team: 'Re', isRevealed: true } : p);
                      // Update rePlayerIds in state - we can do this by returning it in the new state
                  }
              }
          }

          let finalPlayers = updatedPlayers;
          let finalPhase = isLastTrick ? 'Scoring' : 'Playing';
          if (isLastTrick) finalPlayers = GameEngine.revealFinalTeams({ ...prevState, players: updatedPlayers });

          return {
            ...prevState,
            players: finalPlayers,
            rePlayerIds: finalPlayers.filter(p => p.team === 'Re').map(p => p.id),
            currentTrick: [],
            currentPlayerIndex: winnerIndex,
            trickStarterIndex: winnerIndex,
            specialPoints: newSpecialPoints,
            phase: finalPhase as any,
          };
        });
        setIsCleaning(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.currentTrick, isCleaning, settings, state.trickStarterIndex, roomId]);

  const submitBid = useCallback((pid: string, bid: string) => {
    if (roomId) {
        socket.emit('submit_bid', { roomId, bid });
        return;
    }
    setState(prevState => {
      const newBids = { ...prevState.announcements, [pid]: [bid] };
      if (Object.keys(newBids).length === 4) {
        const finalType = GameEngine.determineFinalGameType(Object.fromEntries(Object.entries(newBids).map(([p, b]) => [p, b[0]])));
        let updatedPlayers = [...prevState.players];
        if (['DamenSolo', 'BubenSolo', 'FarbenSolo', 'Fleischlos'].includes(finalType)) {
             const soloPid = Object.entries(newBids).find(([p, b]) => b[0] === finalType)?.[0];
             updatedPlayers = updatedPlayers.map(p => ({ ...p, team: p.id === soloPid ? 'Re' : 'Kontra', isRevealed: true }));
        } else {
            const stateWithTeams = GameEngine.determineTeams({ ...prevState, gameType: finalType as GameType });
            updatedPlayers = stateWithTeams.players;
        }
        return { ...prevState, players: updatedPlayers, gameType: finalType as GameType, phase: 'Playing', announcements: newBids, currentPlayerIndex: (prevState.dealerIndex + 1) % 4, trickStarterIndex: (prevState.dealerIndex + 1) % 4 };
      }
      return { ...prevState, announcements: newBids, currentPlayerIndex: (prevState.currentPlayerIndex + 1) % 4 };
    });
  }, [settings, roomId]);

  // Bot logic only active if NOT multiplayer
  useEffect(() => {
    if (roomId) return; 

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer?.isBot) {
      if (state.phase === 'Bidding') {
        const timer = setTimeout(() => submitBid(currentPlayer.id, 'Gesund'), 500);
        return () => clearTimeout(timer);
      }
      if (state.phase === 'Playing' && !isCleaning) {
        const timer = setTimeout(() => {
          // Bots should only announce Re/Kontra if they are in the correct team and have enough cards
          if (!state.reKontraAnnouncements[currentPlayer.id] && currentPlayer.hand.length >= 10) {
            const isRe = state.rePlayerIds.includes(currentPlayer.id);
            if (Math.random() < 0.1) {
              announceReKontra(currentPlayer.id, isRe ? 'Re' : 'Kontra');
            }
          }
          playCard(currentPlayer.id, Bot.decideMove(currentPlayer, state, settings));
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [state.phase, state.currentPlayerIndex, submitBid, playCard, settings, isCleaning, state.players, announceReKontra, state.reKontraAnnouncements, roomId]);

  const startNewGame = () => {
    if (roomId) {
        // Only host can start? For now assume anyone
        socket.emit('start_game', roomId);
        return;
    }
    const initialState = GameEngine.rotateDealer(state, settings);
    setState({ ...initialState, phase: 'Bidding' });
  };
  
  const resumeGame = useCallback(() => {
    setState(prev => ({ ...prev, phase: prev.lastActivePhase || 'Playing' }));
  }, []);

  const goToMainMenu = useCallback(() => {
    if (roomId) {
        // Disconnect logic?
        socket.disconnect();
        socket.connect(); // Reconnect for new session
        setRoomId(null);
    }
    setState(prev => ({ ...prev, phase: 'MainMenu', lastActivePhase: prev.phase as any }));
  }, [roomId]);

  const openSettings = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'Settings', lastActivePhase: prev.phase as any }));
  }, []);

  const closeSettings = useCallback(() => {
    setState(prev => ({ ...prev, phase: prev.lastActivePhase || 'MainMenu' }));
  }, []);

  const joinGame = (rid: string, pname: string) => {
      setPlayerId(socket.id || null); // Socket ID might not be ready
      socket.emit('join_room', { roomId: rid, playerName: pname });
  };

  const createGame = (pname: string) => {
      setPlayerId(socket.id || null);
      socket.emit('create_room', pname);
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
