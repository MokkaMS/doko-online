import React from 'react';
import { useGame } from '../context/GameContext';
import './WaitingRoom.css';

export const WaitingRoom: React.FC = () => {
  const { state, roomId, hostId, isPublic, startGameMultiplayer, addBotMultiplayer, togglePublic, kickPlayer, goToMainMenu, playerId } = useGame();
  
  const isHost = playerId === hostId;

  return (
    <div className="game-container main-menu">
      <h1 className="menu-title">WARTERAUM</h1>
      <h2 className="room-id-header">Raum ID: <span className="room-id-value">{roomId}</span></h2>
      <div className="room-status-indicator" style={{textAlign: 'center', marginBottom: '10px', color: isPublic ? '#4caf50' : '#ff9800'}}>
          {isPublic ? 'Öffentlich' : 'Privat'}
      </div>
      
      <div className="settings-box waiting-room-box">
        <div className="player-list-header">
            <h3>Spieler ({state.players.length}/4):</h3>
            {isHost && state.players.length < 4 && (
                <button className="menu-button small add-bot-btn" onClick={addBotMultiplayer}>+ Bot</button>
            )}
        </div>
        <ul className="player-list">
            {state.players.map((p, idx) => (
                <li key={idx} className={`player-item ${p.id === playerId ? 'current-player' : ''}`} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span>
                        {p.name} {p.id === playerId && '(Du)'} {p.isBot && '(Bot)'} {p.id === hostId && '👑'}
                        {p.connected === false && <span style={{color: '#ff6b6b', marginLeft: '8px', fontSize: '0.9em'}}>(Getrennt)</span>}
                    </span>
                    {isHost && p.id !== playerId && (
                        <button
                            className="kick-button"
                            onClick={() => kickPlayer(p.id)}
                            style={{
                                background: '#ff4444',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                marginLeft: '10px',
                                fontSize: '0.8em'
                            }}
                            title="Entfernen"
                        >
                            ✕
                        </button>
                    )}
                </li>
            ))}
        </ul>
        
        <div className="menu-content waiting-room-actions">
            {isHost ? (
                <>
                    <button className="menu-button" onClick={startGameMultiplayer}>Spiel Starten</button>
                    <button className="menu-button" onClick={togglePublic} style={{fontSize: '0.9em', padding: '8px'}}>
                        {isPublic ? 'Privat machen' : 'Öffentlich machen'}
                    </button>
                    {state.players.length < 4 && (
                        <div className="bot-info-text">Fehlende Spieler werden beim Start durch Bots ersetzt.</div>
                    )}
                </>
            ) : (
                <div className="waiting-message" style={{textAlign: 'center', margin: '10px 0', fontStyle: 'italic', color: '#ccc'}}>
                    Warte auf Host...
                </div>
            )}
            <button className="menu-button leave-room-btn" onClick={goToMainMenu}>Verlassen</button>
        </div>
      </div>
    </div>
  );
};
