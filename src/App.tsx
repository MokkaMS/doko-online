import React, { useState, useEffect } from 'react';
import './App.css';
import { useGame } from './context/GameContext';
import { WaitingRoom } from './components/WaitingRoom';
import { MainMenu } from './components/MainMenu';
import { GameTable } from './components/GameTable';
import { LandscapeWarning } from './components/LandscapeWarning';
import { toggleFullscreen as toggleFullscreenUtil } from './utils/fullscreen';

const App: React.FC = () => {
  const { state } = useGame();
  const [showMultiplayer, setShowMultiplayer] = useState(false);

  // Reset showMultiplayer when game starts or room is left
  React.useEffect(() => {
    if (state.phase !== 'MainMenu' && state.phase !== 'Lobby') {
      setShowMultiplayer(false);
    }
  }, [state.phase]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    toggleFullscreenUtil(document, navigator, setIsFullscreen);
  };

  const renderContent = () => {
    if (state.phase === 'Lobby') {
        return <WaitingRoom />;
    }

    if (state.phase === 'MainMenu') {
      return <MainMenu showMultiplayer={showMultiplayer} setShowMultiplayer={setShowMultiplayer} />;
    }

    return <GameTable />;
  };

  return (
    <>
      <LandscapeWarning />
      {renderContent()}

      <button
        className="icon-btn fullscreen-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Vollbild beenden" : "Vollbild"}
      >
        {isFullscreen ? '⤡' : '⤢'}
      </button>
    </>
  );
};

export default App;
