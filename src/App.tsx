import React, { useState, useCallback, useMemo, memo } from 'react';
import './App.css';
import { useGame } from './context/GameContext';
import { Card, Suit, CardValue } from './logic/types';
import { sortCards } from './logic/cardUtils';
import { MultiplayerSetup } from './components/MultiplayerSetup';
import { WaitingRoom } from './components/WaitingRoom';
import { SettingsScreen } from './components/SettingsScreen';

const suitSymbols: Record<Suit, string> = { [Suit.Kreuz]: '♣', [Suit.Pik]: '♠', [Suit.Herz]: '♥', [Suit.Karo]: '♦' };
const valueSymbols: Record<CardValue, string> = { [CardValue.Ass]: 'A', [CardValue.Zehn]: '10', [CardValue.Koenig]: 'K', [CardValue.Dame]: 'D', [CardValue.Bube]: 'B', [CardValue.Neun]: '9' };

const CardComponent = memo<{ card: Card; onClick?: (card: Card) => void; className?: string }>(({ card, onClick, className }) => {
  const isRed = card.suit === Suit.Herz || card.suit === Suit.Karo;
  const handleClick = () => {
    if (onClick) {
      onClick(card);
    }
  };
  return (
    <div className={`card ${isRed ? 'red' : 'black'} ${className || ''}`} onClick={handleClick}>
      <div className="card-corner top">{valueSymbols[card.value]}</div>
      <div className="card-center">{suitSymbols[card.suit]}</div>
      <div className="card-corner bottom">{valueSymbols[card.value]}</div>
    </div>
  );
});

const App: React.FC = () => {
  const { state, startNewGame, resumeGame, playCard, submitBid, announceReKontra, openSettings, settings, goToMainMenu, playerId } = useGame();
  const [showMultiplayer, setShowMultiplayer] = useState(false);

  // Reset showMultiplayer when game starts or room is left
  React.useEffect(() => {
    if (state.phase !== 'MainMenu' && state.phase !== 'Lobby') {
      setShowMultiplayer(false);
    }
  }, [state.phase]);

  // In Multiplayer, find "me". In Singleplayer, it is index 0.
  const humanPlayer = (playerId ? state.players.find(p => p.id === playerId || p.socketId === playerId) : state.players[0]) || state.players[0];

  const handlePlayCard = useCallback((card: Card) => {
    if (humanPlayer) {
      playCard(humanPlayer.id, card);
    }
  }, [playCard, humanPlayer?.id]);

  const sortedHand = useMemo(() => {
    if (!humanPlayer?.hand) return [];
    return sortCards(humanPlayer.hand, state.gameType, state.trumpSuit, settings);
  }, [humanPlayer?.hand, state.gameType, state.trumpSuit, settings]);

  if (!humanPlayer) return <div className="game-container">Lade Spieler...</div>;

  const hasBothReQueens = humanPlayer?.hand?.filter(c => c.suit === Suit.Kreuz && c.value === CardValue.Dame).length === 2;

  if (state.phase === 'Lobby') {
      return <WaitingRoom />;
  }

  if (state.phase === 'Settings') {
      return <SettingsScreen />;
  }

  if (state.phase === 'MainMenu') {
    if (showMultiplayer) {
        return <MultiplayerSetup onBack={() => setShowMultiplayer(false)} />;
    }
    return (
      <div className="game-container main-menu">
        <h1 className="menu-title">DOPPELKOPF</h1>
        <div className="menu-content">
          <button className="menu-button" onClick={startNewGame}>Einzelspieler</button>
          <button className="menu-button" onClick={() => setShowMultiplayer(true)}>Multiplayer</button>
          {state.lastActivePhase && state.lastActivePhase !== 'Scoring' && (
             <button className="menu-button" onClick={resumeGame}>Weiterspielen</button>
          )}
          <button className="menu-button" onClick={openSettings}>Einstellungen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-header">
         <h1 className="game-status-title">DOPPELKOPF - {state.phase === 'Bidding' ? 'Vorbehalt wählen' : (state.gameType === 'Normal' ? 'Normalspiel' : state.gameType)}</h1>
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => submitBid(humanPlayer.id, 'Gesund')}>Gesund</button>
              {hasBothReQueens && <button onClick={() => submitBid(humanPlayer.id, 'Hochzeit')}>Hochzeit</button>}
              <button onClick={() => submitBid(humanPlayer.id, 'DamenSolo')}>Damen-Solo</button>
              <button onClick={() => submitBid(humanPlayer.id, 'BubenSolo')}>Buben-Solo</button>
            </div>
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
                <span className="player-name">{p.name} {p.id === state.players[state.dealerIndex]?.id && '(G)'}</span>
                {state.currentPlayerIndex === idx && <span className="current-turn-indicator">★</span>}
              </div>
              <span className="player-points">{p.points} Pkt</span>
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
             return (
               <div key={card.id} className={`trick-card-wrapper tcc-${playerIdx}`}>
                 <div className="trick-card-label">{state.players[playerIdx].name}</div>
                 <CardComponent card={card} className="trick-card" />
               </div>
             )
          })}
        </div>
      </div>

      <div className="hand">
        {sortedHand.map(card => (
          <CardComponent key={card.id} card={card} onClick={handlePlayCard}/>
        ))}
      </div>

      <div className="controls">
        <button onClick={goToMainMenu}>Hauptmenü</button>
      </div>

      {state.phase === 'Scoring' && (
        <div className="scoring-overlay">
          <h2>SPIEL BEENDET</h2>
          {(() => {
            const reP = state.players.filter(p => p.team === 'Re').reduce((s, p) => s + p.points, 0);
            const reWins = reP > 120;
            return (
              <div className="scoring-results">
                <div className="winner-banner">{reWins ? 'TEAM RE GEWINNT!' : 'TEAM KONTRA GEWINNT!'}</div>
              </div>
            );
          })()}
          <button className="menu-button" onClick={startNewGame}>Nächste Runde</button>
        </div>
      )}
    </div>
  );
};

export default App;
