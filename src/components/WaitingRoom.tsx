import React from 'react';
import { useGame } from '../context/GameContext';
import './WaitingRoom.css';

export const WaitingRoom: React.FC = () => {
  const { state, roomId, startGameMultiplayer, addBotMultiplayer, goToMainMenu, playerId } = useGame();
  
  return (
    <div className="game-container main-menu">
      <h1 className="menu-title">WARTERAUM</h1>
      <h2 className="room-id-header">Raum ID: <span className="room-id-value">{roomId}</span></h2>
      
      <div className="settings-box waiting-room-box">
        <div className="player-list-header">
            <h3>Spieler ({state.players.length}/4):</h3>
            {state.players.length < 4 && (
                <button className="menu-button small add-bot-btn" onClick={addBotMultiplayer}>+ Bot</button>
            )}
        </div>
        <ul className="player-list">
            {state.players.map((p, idx) => (
                <li key={idx} className={`player-item ${p.socketId === playerId ? 'current-player' : ''}`}>
                    {p.name} {p.socketId === playerId && '(Du)'} {p.isBot && '(Bot)'}
                </li>
            ))}
        </ul>
        
        <div className="menu-content waiting-room-actions">
            <button className="menu-button" onClick={startGameMultiplayer}>Spiel Starten</button>
            {state.players.length < 4 && (
                <div className="bot-info-text">Fehlende Spieler werden beim Start durch Bots ersetzt.</div>
            )}
            <button className="menu-button leave-room-btn" onClick={goToMainMenu}>Verlassen</button>
        </div>
      </div>
    </div>
  );
};
