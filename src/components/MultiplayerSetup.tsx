import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export const MultiplayerSetup: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { joinGame, createGame } = useGame();
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleJoin = () => {
    if (name && roomId) joinGame(roomId, name);
  };
  
  const handleCreate = () => {
    if (name) createGame(name);
  };

  return (
    <div className="game-container main-menu">
      <h1 className="menu-title">MULTIPLAYER</h1>
      <div className="settings-box">
        <div className="settings-grid">
           <label>Dein Name: <input value={name} onChange={e => setName(e.target.value)} style={{color:'black', marginLeft:'10px', padding:'5px', fontSize:'18px'}}/></label>
        </div>
        <div className="menu-content" style={{gap: '15px', marginTop: '20px'}}>
            <button className="menu-button" onClick={handleCreate}>Neues Spiel erstellen</button>
            
            <div style={{display:'flex', gap:'10px', alignItems:'center', justifyContent:'center'}}>
                <input placeholder="Raum ID" value={roomId} onChange={e => setRoomId(e.target.value)} style={{padding:'10px', fontSize:'18px', borderRadius:'8px', border:'none', width:'120px'}}/>
                <button className="menu-button" onClick={handleJoin}>Beitreten</button>
            </div>
            <button className="menu-button" onClick={onBack} style={{marginTop:'20px', background:'#555'}}>Zurück</button>
        </div>
      </div>
    </div>
  );
};
