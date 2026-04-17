import React, { useCallback, useMemo, useState, useLayoutEffect, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { Card, Suit, CardValue } from '../logic/types';
import { sortCards } from '../logic/cardUtils';
import { CardComponent } from './CardComponent';
import { TRICK_ANIMATION_STEP1_MS, TRICK_ANIMATION_STEP2_MS, PLAY_CARD_SAFETY_TIMEOUT_MS } from '../config/constants';

export const GameTable: React.FC = () => {
  const { state, playCard, submitBid, announceReKontra, settings, goToMainMenu, playerId, startNewGame, reconnect } = useGame();
  const { theme, toggleTheme } = useTheme();
  const [showFarbenSoloSelection, setShowFarbenSoloSelection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const [scale, setScale] = useState(1);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [trickAnimationPhase, setTrickAnimationPhase] = useState<'idle' | 'waiting' | 'center' | 'winner'>('idle');
  const [popupText, setPopupText] = useState<string | null>(null);

  const baseWidth = 1024;
  const baseHeight = 768;

  useLayoutEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / baseWidth;
      const scaleY = window.innerHeight / baseHeight;
      setScale(Math.min(scaleX, scaleY));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const trickNotificationsKey = state.currentTrickNotifications?.join(',') || '';

  useEffect(() => {
    let popupTimer: ReturnType<typeof setTimeout>;
    if (state.currentTrickNotifications && state.currentTrickNotifications.length > 0) {
        setPopupText(state.currentTrickNotifications.join(' + '));
        popupTimer = setTimeout(() => {
            setPopupText(null);
        }, 1500); // Popup is shown for 1.5s
    } else {
        setPopupText(null);
    }
    return () => clearTimeout(popupTimer);
  }, [trickNotificationsKey]);

  useEffect(() => {
    let timer1: ReturnType<typeof setTimeout>;
    let timer2: ReturnType<typeof setTimeout>;

    if (state.currentTrick.length === 4) {
      setTrickAnimationPhase('waiting');
      // Step 1: Wait (cards on table)
      timer1 = setTimeout(() => {
        setTrickAnimationPhase('center');
        // Step 2: Move to center
        timer2 = setTimeout(() => {
          setTrickAnimationPhase('winner');
        }, TRICK_ANIMATION_STEP2_MS);
      }, TRICK_ANIMATION_STEP1_MS);
    } else {
      setTrickAnimationPhase('idle');
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [state.currentTrick.length]);

  // Reset processing state and selection when game state updates
  useEffect(() => {
    setIsProcessing(false);
    processingRef.current = false;
  }, [state]);

  // In Multiplayer, find "me". In Singleplayer, it is index 0.
  const humanPlayer = (playerId ? state.players.find(p => p.id === playerId || p.socketId === playerId) : state.players[0]) || state.players[0];

  const localPlayerIndex = useMemo(() => {
      if (!humanPlayer) return 0;
      const idx = state.players.findIndex(p => p.id === humanPlayer.id);
      return idx >= 0 ? idx : 0;
  }, [state.players, humanPlayer]);

  const handlePlayCard = useCallback((card: Card) => {
    if (humanPlayer && !processingRef.current && !isProcessing) {
      if (state.currentPlayerIndex !== localPlayerIndex) return;

      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      if (!isTouch || selectedCardId === card.id) {
          processingRef.current = true;
          setIsProcessing(true);
          playCard(humanPlayer.id, card);
          setSelectedCardId(null);

          // Safety timeout to reset processing state if server doesn't respond
          setTimeout(() => {
              if (processingRef.current) {
                  processingRef.current = false;
                  setIsProcessing(false);
              }
          }, PLAY_CARD_SAFETY_TIMEOUT_MS);
      } else {
          setSelectedCardId(card.id);
      }
    }
  }, [playCard, humanPlayer?.id, selectedCardId, isProcessing, state.currentPlayerIndex, localPlayerIndex]);

  const handleFarbenSoloClick = () => {
      setShowFarbenSoloSelection(true);
  };

  const handleSuitSelect = (suit: Suit) => {
      if (humanPlayer) {
          submitBid(humanPlayer.id, `FarbenSolo_${suit}`);
          setShowFarbenSoloSelection(false);
      }
  };

  const sortedHand = useMemo(() => {
    if (!humanPlayer?.hand) return [];
    return sortCards(humanPlayer.hand, state.gameType, state.trumpSuit, settings);
  }, [humanPlayer?.hand, state.gameType, state.trumpSuit, settings]);

  if (!humanPlayer) return <div className="game-container">Lade Spieler...</div>;

  const hasBothReQueens = humanPlayer?.hand?.filter(c => c.suit === Suit.Kreuz && c.value === CardValue.Dame).length === 2;

  return (
    <div className="game-container" onClick={(e) => {
        // Deselect if clicking outside of a card (simplified)
        // If the target is not part of .card, we deselect.
        // But CardComponent stops propagation? No.
        // Let's keep it simple: clicking background deselects.
        if (!(e.target as HTMLElement).closest('.card')) {
            setSelectedCardId(null);
        }
    }}>
      <div className="opponents-stripe">
        {[1, 2, 3].map(relativeIdx => {
          const absoluteIdx = (localPlayerIndex + relativeIdx) % 4;
          const p = state.players[absoluteIdx];
          if (!p) return null;

          return (
            <div key={p.id} className={`opponent-info-inline opponent-${relativeIdx}`}>
              <div className="opponent-header">
                <span className="opponent-name">
                  {p.name} {p.id === state.players[state.dealerIndex]?.id && '(G)'}
                  {p.connected === false && <span style={{color: '#ff6b6b', marginLeft: '5px', fontSize: '0.8em'}}>(Disc)</span>}
                </span>
                {state.currentPlayerIndex === absoluteIdx && <span className="current-turn-indicator">★</span>}
              </div>
              <span className="opponent-points">
                {p.tournamentPoints} Pkt
                {state.phase === 'Scoring' && ` (${p.points} A)`}
              </span>
              <div className="badges-row inline-badges">
                {(p.isRevealed || state.phase === 'Scoring') && (
                    <div className="team-badge">{p.team}</div>
                )}
                {!p.isRevealed && state.phase !== 'Scoring' && (
                    <div className="team-badge">?</div>
                )}
                {state.reKontraAnnouncements[p.id] && <div className="rekontra-badge">{state.reKontraAnnouncements[p.id]}</div>}
                {state.announcements[p.id] && <div className="bid-badge">{state.announcements[p.id][0]}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="local-player-box">
        <div className="opponent-header">
          <span className="opponent-name">
            {humanPlayer.name} {humanPlayer.id === state.players[state.dealerIndex]?.id && '(G)'}
            {humanPlayer.connected === false && <span style={{color: '#ff6b6b', marginLeft: '5px', fontSize: '0.8em'}}>(Disc)</span>}
          </span>
          {state.currentPlayerIndex === localPlayerIndex && <span className="current-turn-indicator">★</span>}
        </div>
        <span className="opponent-points">
          {humanPlayer.tournamentPoints} Pkt
          {state.phase === 'Scoring' && ` (${humanPlayer.points} A)`}
        </span>
        <div className="badges-row inline-badges">
          <div className="team-badge">{humanPlayer.team}</div>
          {state.reKontraAnnouncements[humanPlayer.id] && <div className="rekontra-badge">{state.reKontraAnnouncements[humanPlayer.id]}</div>}
          {state.announcements[humanPlayer.id] && <div className="bid-badge">{state.announcements[humanPlayer.id][0]}</div>}
        </div>
      </div>

      <div className="game-actions">
        {state.phase === 'Playing' && humanPlayer?.hand?.length >= 10 && !state.reKontraAnnouncements[humanPlayer.id] && (
           <div className="re-kontra-buttons">
             {humanPlayer.team === 'Re' && <button className="ansage-btn re" onClick={() => announceReKontra(humanPlayer.id, 'Re')}>RE Ansagen</button>}
             {humanPlayer.team === 'Kontra' && <button className="ansage-btn kontra" onClick={() => announceReKontra(humanPlayer.id, 'Kontra')}>KONTRA Ansagen</button>}
           </div>
        )}
        {state.phase === 'Bidding' && state.currentPlayerIndex === state.players.findIndex(p => p.id === humanPlayer.id) && (
          <div className="bidding-area">
            <h3>Wähle deinen Vorbehalt:</h3>
            {!showFarbenSoloSelection ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={() => submitBid(humanPlayer.id, 'Gesund')}>Gesund</button>
                  {hasBothReQueens && <button className="hochzeit-highlight" onClick={() => submitBid(humanPlayer.id, 'Hochzeit')}>Hochzeit</button>}
                  <button onClick={() => submitBid(humanPlayer.id, 'DamenSolo')}>Damen-Solo</button>
                  <button onClick={() => submitBid(humanPlayer.id, 'BubenSolo')}>Buben-Solo</button>
                  <button onClick={() => submitBid(humanPlayer.id, 'DamenBubensolo')}>Damen-Buben-Solo</button>
                  <button onClick={handleFarbenSoloClick}>Farben-Solo</button>
                  <button onClick={() => submitBid(humanPlayer.id, 'Fleischlos')}>Fleischlos</button>
                </div>
            ) : (
                <div className="suit-selection">
                    <h4>Wähle Solo-Farbe:</h4>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={() => handleSuitSelect(Suit.Kreuz)}>Kreuz ♣</button>
                        <button onClick={() => handleSuitSelect(Suit.Pik)}>Pik ♠</button>
                        <button onClick={() => handleSuitSelect(Suit.Herz)}>Herz ♥</button>
                        <button onClick={() => handleSuitSelect(Suit.Karo)}>Karo ♦</button>
                        <button onClick={() => setShowFarbenSoloSelection(false)} style={{backgroundColor: '#666'}}>Zurück</button>
                    </div>
                </div>
            )}
          </div>
        )}
        {state.phase === 'Bidding' && state.currentPlayerIndex !== state.players.findIndex(p => p.id === humanPlayer.id) && (
             <div className="bidding-area">Warte auf andere Spieler...</div>
        )}
      </div>

      <div className="controls">
        <button onClick={toggleTheme} className="icon-btn" title="Theme">
          {theme === 'classic' ? '🌓' : '☀'}
        </button>
        <button onClick={goToMainMenu} className="icon-btn" title="Hauptmenü">
          ☰
        </button>
      </div>

      <div className="hand">
        {sortedHand.map(card => (
          <CardComponent
            key={card.id}
            card={card}
            onClick={handlePlayCard}
            disabled={state.phase !== 'Playing' || isProcessing || state.currentTrick.length >= 4 || state.currentPlayerIndex !== localPlayerIndex}
            className={selectedCardId === card.id ? 'selected' : ''}
          />
        ))}
      </div>

      <div
        className="game-board-scaler"
        style={{
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative'
        }}
      >
        <div className="table">
          <div className="trick">
            {state.currentTrick.map((card, i) => {
               const playerIdx = (state.trickStarterIndex + i) % 4;
               if (!state.players[playerIdx]) return null;

               // Convert absolute player index to relative view index
               const relativeIdx = (playerIdx - localPlayerIndex + 4) % 4;

               let animationClass = '';
               if (state.currentTrick.length === 4) {
                   if (trickAnimationPhase === 'center') animationClass = 'move-to-center';
                   else if (trickAnimationPhase === 'winner' && state.trickWinnerIndex !== null) {
                       const relativeWinnerIdx = (state.trickWinnerIndex - localPlayerIndex + 4) % 4;
                       animationClass = `move-to-player-${relativeWinnerIdx}`;
                   }
               }

               return (
                 <div key={card.id} className={`trick-card-wrapper tcc-${relativeIdx} ${animationClass}`} style={{ zIndex: i }}>
                   <div className="trick-card-label">{state.players[playerIdx].name}</div>
                   <CardComponent card={card} className="trick-card" />
                 </div>
               )
            })}
          </div>
        </div>

        {popupText && (
          <div className="special-popup-overlay">
            {popupText}
          </div>
        )}

        {state.phase === 'Scoring' && state.lastGameResult && (
          <div className="scoring-overlay">
            <h2>SPIEL BEENDET</h2>
            <div className="scoring-results">
              <div className="winner-banner">
                  {state.lastGameResult.winner === humanPlayer.team ? 'DU HAST GEWONNEN!' : 'DU HAST VERLOREN!'}
              </div>
              <div className="score-details">
                  <div className="team-score-column">
                      <h3>Re ({state.lastGameResult.reAugen} Augen)</h3>
                      <div style={{ marginBottom: '10px', borderBottom: '1px solid #aaa', paddingBottom: '5px' }}>
                          {state.players.filter(p => p.team === 'Re').map(p => (
                               <div key={p.id} style={{fontSize: '0.9em'}}>{p.name}: {p.points}</div>
                          ))}
                      </div>
                      <ul>
                          {state.lastGameResult.details.re.map((d, i) => <li key={i}>+1 {d}</li>)}
                      </ul>
                  </div>
                  <div className="team-score-column">
                      <h3>Kontra ({state.lastGameResult.kontraAugen} Augen)</h3>
                      <div style={{ marginBottom: '10px', borderBottom: '1px solid #aaa', paddingBottom: '5px' }}>
                          {state.players.filter(p => p.team === 'Kontra').map(p => (
                               <div key={p.id} style={{fontSize: '0.9em'}}>{p.name}: {p.points}</div>
                          ))}
                      </div>
                      <ul>
                          {state.lastGameResult.details.kontra.map((d, i) => <li key={i}>+1 {d}</li>)}
                      </ul>
                  </div>
              </div>
              <div className="final-score-summary">
                  Punkte für Gewinner: {state.lastGameResult.winningPoints}
              </div>
            </div>
            <button className="menu-button" onClick={startNewGame}>Nächste Runde</button>
          </div>
        )}
      </div>
    </div>
  );
};
