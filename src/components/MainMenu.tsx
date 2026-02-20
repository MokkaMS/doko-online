import React from 'react';
import { useGame } from '../context/GameContext';
import { MultiplayerSetup } from './MultiplayerSetup';

interface MainMenuProps {
  showMultiplayer: boolean;
  setShowMultiplayer: (show: boolean) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ showMultiplayer, setShowMultiplayer }) => {
  const { state, startNewGame, resumeGame, openSettings } = useGame();

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
};
