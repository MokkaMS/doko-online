import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GameProvider } from './context/GameContext';
import { ThemeProvider } from './context/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </ThemeProvider>
  </React.StrictMode>
);
