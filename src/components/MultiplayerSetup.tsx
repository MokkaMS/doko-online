import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { getStoredPlayerName } from '../utils/storage';

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
    <div className="game-container main-menu" style={{overflowY: 'auto', maxHeight: '100vh'}}>
      <h1 className="menu-title">SPIELEN</h1>
      <div className="settings-box">
        <div className="settings-grid">
           <label>Dein Name: <input value={name} onChange={e => setName(e.target.value)} style={{backgroundColor: 'white', color:'black', marginLeft:'10px', padding:'5px', fontSize:'18px'}}/></label>
        </div>
        <div className="menu-content" style={{gap: '15px', marginTop: '20px'}}>
            <button className="menu-button" onClick={handleCreate}>Neues Spiel erstellen</button>
            
            <div style={{display:'flex', gap:'10px', alignItems:'center', justifyContent:'center'}}>
                <input placeholder="Raum ID" value={roomId} onChange={e => setRoomId(e.target.value)} style={{backgroundColor: 'white', color: 'black', padding:'10px', fontSize:'18px', borderRadius:'8px', border:'none', width:'120px'}}/>
                <button className="menu-button" onClick={handleJoin}>Beitreten</button>
            </div>

            {/* Public Rooms Section */}
            <div style={{marginTop: '30px', borderTop: '1px solid #555', paddingTop: '20px', width: '100%'}}>
                <h3 style={{marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    Öffentliche Räume
                    <button
                        onClick={refreshPublicRooms}
                        style={{
                            background: 'transparent',
                            border: '1px solid #aaa',
                            color: '#aaa',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8em',
                            padding: '4px 8px'
                        }}
                    >
                        ↻
                    </button>
                </h3>

                {publicRooms.length === 0 ? (
                    <div style={{color: '#888', fontStyle: 'italic'}}>Keine öffentlichen Räume gefunden.</div>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto'}}>
                        {publicRooms.map(room => (
                            <div
                                key={room.id}
                                onClick={() => {
                                    setRoomId(room.id);
                                    // Optional: Auto join if needed, but manual join is safer to confirm name
                                }}
                                style={{
                                    background: '#333',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: roomId === room.id ? '2px solid #4caf50' : '1px solid #444'
                                }}
                            >
                                <div>
                                    <span style={{fontWeight: 'bold', color: '#ffeb3b'}}>{room.id}</span>
                                    <span style={{marginLeft: '10px', color: '#ccc'}}>Host: {room.hostName}</span>
                                </div>
                                <div style={{color: room.playerCount >= 4 ? '#ff6b6b' : '#4caf50'}}>
                                    {room.playerCount}/4
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button className="menu-button" onClick={onBack} style={{marginTop:'20px', background:'#555'}}>Zurück</button>
        </div>
      </div>
    </div>
  );
};
