import React, { useCallback, useMemo, useState, useLayoutEffect, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Card, Suit, CardValue } from '../logic/types';
import { sortCards } from '../logic/cardUtils';
import { CardComponent } from './CardComponent';

export const GameTable: React.FC = () => {
  const { state, playCard, submitBid, announceReKontra, settings, goToMainMenu, playerId, startNewGame } = useGame();
  const [showFarbenSoloSelection, setShowFarbenSoloSelection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [trickAnimationPhase, setTrickAnimationPhase] = useState<'idle' | 'waiting' | 'center' | 'winner'>('idle');

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

  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;

    if (state.currentTrick.length === 4) {
      setTrickAnimationPhase('waiting');
      // Step 1: Wait 1s (cards on table)
      timer1 = setTimeout(() => {
        setTrickAnimationPhase('center');
        // Step 2: Move to center (wait 1s total: 0.5s transition + 0.5s pause)
        timer2 = setTimeout(() => {
          setTrickAnimationPhase('winner');
        }, 1000);
      }, 1000);
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
    // Reset selection if the hand size changes (card played) or phase changes
    // We can also reset on every state update to be safe, but that might be annoying if polling updates happen.
    // Better: reset if the card is no longer in hand.
  }, [state]);

  // In Multiplayer, find "me". In Singleplayer, it is index 0.
  const humanPlayer = (playerId ? state.players.find(p => p.id === playerId || p.socketId === playerId) : state.players[0]) || state.players[0];

  const handlePlayCard = useCallback((card: Card) => {
    if (humanPlayer) {
      if (selectedCardId === card.id) {
          setIsProcessing(true);
          playCard(humanPlayer.id, card);
          setSelectedCardId(null);
      } else {
          setSelectedCardId(card.id);
      }
    }
  }, [playCard, humanPlayer?.id, selectedCardId]);

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
      <div className="game-header">
         <h1 className="game-status-title">DOPPELKOPF - {state.phase === 'Bidding' ? 'Vorbehalt wählen' : (state.gameType === 'Normal' ? 'Normalspiel' : state.gameType)}</h1>
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
                    {hasBothReQueens && <button onClick={() => submitBid(humanPlayer.id, 'Hochzeit')}>Hochzeit</button>}
                    <button onClick={() => submitBid(humanPlayer.id, 'DamenSolo')}>Damen-Solo</button>
                    <button onClick={() => submitBid(humanPlayer.id, 'BubenSolo')}>Buben-Solo</button>
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

        <div className="table">
          {[0,1,2,3].map(idx => {
            const p = state.players[idx];
            if (!p) return null;
            // Simple positioning for now: fixed
            const posClass = ['player-bottom', 'player-left', 'player-top', 'player-right'][idx];
            return (
              <div key={p.id} className={`player-info ${posClass}`}>
                <div className="player-header">
                  <span className="player-name">
                    {p.name} {p.id === state.players[state.dealerIndex]?.id && '(G)'}
                    {p.connected === false && <span style={{color: '#ff6b6b', marginLeft: '5px', fontSize: '0.8em'}}>(Disc)</span>}
                  </span>
                  {state.currentPlayerIndex === idx && <span className="current-turn-indicator">★</span>}
                </div>
                <span className="player-points">
                  {p.tournamentPoints} Pkt
                  {state.phase === 'Scoring' && ` (${p.points} A)`}
                </span>
                <div className="badges-row">
                  {(p.id === humanPlayer.id || p.isRevealed || state.phase === 'Scoring') && (
                      <div className="team-badge">{p.team}</div>
                  )}
                  {p.id !== humanPlayer.id && !p.isRevealed && state.phase !== 'Scoring' && (
                      <div className="team-badge">?</div>
                  )}
                  {state.reKontraAnnouncements[p.id] && <div className="rekontra-badge">{state.reKontraAnnouncements[p.id]}</div>}
                </div>
                {state.announcements[p.id] && <div className="bid-badge">{state.announcements[p.id][0]}</div>}
              </div>
            );
          })}

          <div className="trick">
            {state.currentTrick.map((card, i) => {
               const playerIdx = (state.trickStarterIndex + i) % 4;
               if (!state.players[playerIdx]) return null;

               let animationClass = '';
               if (state.currentTrick.length === 4) {
                   if (trickAnimationPhase === 'center') animationClass = 'move-to-center';
                   else if (trickAnimationPhase === 'winner' && state.trickWinnerIndex !== null) animationClass = `move-to-player-${state.trickWinnerIndex}`;
               }

               return (
                 <div key={card.id} className={`trick-card-wrapper tcc-${playerIdx} ${animationClass}`}>
                   <div className="trick-card-label">{state.players[playerIdx].name}</div>
                   <CardComponent card={card} className="trick-card" />
                 </div>
               )
            })}
          </div>
        </div>

        <div className="hand">
          {sortedHand.map(card => (
            <CardComponent
              key={card.id}
              card={card}
              onClick={handlePlayCard}
              disabled={state.phase !== 'Playing' || isProcessing || state.currentTrick.length >= 4}
              className={selectedCardId === card.id ? 'selected' : ''}
            />
          ))}
        </div>

        <div className="controls">
          <button onClick={goToMainMenu}>Hauptmenü</button>
        </div>

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
