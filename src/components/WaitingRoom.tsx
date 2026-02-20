import React from 'react';
import { useGame } from '../context/GameContext';

export const WaitingRoom: React.FC = () => {
  const { state, roomId, startGameMultiplayer, addBotMultiplayer, goToMainMenu, playerId } = useGame();
  
  return (
    <div className="game-container main-menu">
      <h1 className="menu-title">WARTERAUM</h1>
      <h2 style={{color:'white'}}>Raum ID: <span style={{color:'#ffeb3b', fontSize:'40px', letterSpacing:'5px'}}>{roomId}</span></h2>
      
      <div className="settings-box" style={{minWidth:'400px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3>Spieler ({state.players.length}/4):</h3>
            {state.players.length < 4 && (
                <button className="menu-button small" onClick={addBotMultiplayer} style={{padding:'8px 15px', fontSize:'14px'}}>+ Bot</button>
            )}
        </div>
        <ul style={{listStyle:'none', padding:0, fontSize:'20px'}}>
            {state.players.map((p, idx) => (
                <li key={idx} style={{padding:'5px', borderBottom:'1px solid #444', color: p.socketId === playerId ? '#ffeb3b' : 'white'}}>
                    {p.name} {p.socketId === playerId && '(Du)'} {p.isBot && '(Bot)'}
                </li>
            ))}
        </ul>
        
        <div className="menu-content" style={{marginTop:'30px'}}>
            <button className="menu-button" onClick={startGameMultiplayer}>Spiel Starten</button>
            {state.players.length < 4 && (
                <div style={{opacity:0.7, padding: '10px', fontSize: '14px'}}>Fehlende Spieler werden beim Start durch Bots ersetzt.</div>
            )}
            <button className="menu-button" onClick={goToMainMenu} style={{marginTop:'20px', background:'#d32f2f'}}>Verlassen</button>
        </div>
      </div>
    </div>
  );
};
