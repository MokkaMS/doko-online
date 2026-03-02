import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { getStoredPlayerName } from '../utils/storage';
import './MultiplayerSetup.css';

export const MultiplayerSetup: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { joinGame, createGame, publicRooms, refreshPublicRooms } = useGame();
  const [name, setName] = useState(() => getStoredPlayerName() || '');
  const [roomId, setRoomId] = useState('');

  const handleJoin = () => {
    if (name && roomId) joinGame(roomId, name);
  };
  
  const handleCreate = () => {
    if (name) createGame(name);
  };

  useEffect(() => {
    refreshPublicRooms();
  }, []);

  return (
    <div className="game-container main-menu multiplayer-container">
      <h1 className="menu-title">SPIELEN</h1>
      <div className="settings-box">
        <div className="settings-grid">
           <label>Dein Name: <input value={name} onChange={e => setName(e.target.value)} className="name-input"/></label>
        </div>
        <div className="menu-content setup-menu-content">
            <button className="menu-button" onClick={handleCreate}>Neues Spiel erstellen</button>
            
            <div className="join-row">
                <input placeholder="Raum ID" value={roomId} onChange={e => setRoomId(e.target.value)} className="room-id-input"/>
                <button className="menu-button" onClick={handleJoin}>Beitreten</button>
            </div>

            {/* Public Rooms Section */}
            <div className="public-rooms-section">
                <h3 className="public-rooms-header">
                    Öffentliche Räume
                    <button onClick={refreshPublicRooms} className="refresh-btn">↻</button>
                </h3>

                {publicRooms.length === 0 ? (
                    <div className="no-rooms">Keine öffentlichen Räume gefunden.</div>
                ) : (
                    <div className="rooms-list">
                        {publicRooms.map(room => (
                            <div
                                key={room.id}
                                onClick={() => {
                                    setRoomId(room.id);
                                }}
                                className={`room-item ${roomId === room.id ? 'selected' : ''}`}
                            >
                                <div>
                                    <span className="room-id-text">{room.id}</span>
                                    <span className="room-host-text">Host: {room.hostName}</span>
                                </div>
                                <div className={`player-count ${room.playerCount >= 4 ? 'full' : ''}`}>
                                    {room.playerCount}/4
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button className="menu-button back-btn" onClick={onBack}>Zurück</button>
        </div>
      </div>
    </div>
  );
};
