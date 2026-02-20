import React from 'react';
import { useGame } from '../context/GameContext';

export const SettingsScreen: React.FC = () => {
  const { settings, setSettings, closeSettings } = useGame();

  return (
    <div className="game-container main-menu">
      <h1 className="menu-title">EINSTELLUNGEN</h1>
      <div className="settings-box" style={{ minWidth: '500px' }}>
        <div className="settings-grid" style={{ marginBottom: '30px' }}>
          <label><input type="checkbox" checked={settings.mitNeunen} onChange={e => setSettings({...settings, mitNeunen: e.target.checked})}/> Mit Neunen (48 Karten)</label>
          <label><input type="checkbox" checked={settings.dullenAlsHoechste} onChange={e => setSettings({...settings, dullenAlsHoechste: e.target.checked})}/> Dullen als höchste Trümpfe</label>
          <label><input type="checkbox" checked={settings.schweinchen} onChange={e => setSettings({...settings, schweinchen: e.target.checked})}/> Schweinchen (Zwei Karo Asse)</label>
          <label><input type="checkbox" checked={settings.fuchsGefangen} onChange={e => setSettings({...settings, fuchsGefangen: e.target.checked})}/> Sonderpunkt: Fuchs gefangen</label>
          <label><input type="checkbox" checked={settings.karlchen} onChange={e => setSettings({...settings, karlchen: e.target.checked})}/> Sonderpunkt: Karlchen am End</label>
          <label><input type="checkbox" checked={settings.doppelkopfPunkte} onChange={e => setSettings({...settings, doppelkopfPunkte: e.target.checked})}/> Sonderpunkt: Doppelkopf</label>
        </div>
        <div className="menu-content">
          <button className="menu-button" onClick={closeSettings}>Speichern & Zurück</button>
        </div>
      </div>
    </div>
  );
};
