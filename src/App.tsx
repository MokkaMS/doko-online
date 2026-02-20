import React, { useState } from 'react';
import './App.css';
import { useGame } from './context/GameContext';
import { WaitingRoom } from './components/WaitingRoom';
import { SettingsScreen } from './components/SettingsScreen';
import { MainMenu } from './components/MainMenu';
import { GameTable } from './components/GameTable';

const App: React.FC = () => {
  const { state } = useGame();
  const [showMultiplayer, setShowMultiplayer] = useState(false);

  // Reset showMultiplayer when game starts or room is left
  React.useEffect(() => {
    if (state.phase !== 'MainMenu' && state.phase !== 'Lobby') {
      setShowMultiplayer(false);
    }
  }, [state.phase]);

  if (state.phase === 'Lobby') {
      return <WaitingRoom />;
  }

  if (state.phase === 'Settings') {
      return <SettingsScreen />;
  }

  if (state.phase === 'MainMenu') {
    return <MainMenu showMultiplayer={showMultiplayer} setShowMultiplayer={setShowMultiplayer} />;
  }

  return <GameTable />;
};

export default App;
