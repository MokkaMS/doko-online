import React from 'react';

export const LandscapeWarning: React.FC = () => {
  return (
    <div className="landscape-warning">
      <div className="warning-content">
        <h1>Bitte Gerät drehen</h1>
        <p>Das Spiel ist für das Querformat optimiert.</p>
        <div className="rotate-icon">📱 ➡️ 🔄</div>
      </div>
    </div>
  );
};
