import React from 'react';
import ReactDOM from 'react-dom/client';
import YouTubeMp3Player from './YouTubeMp3Player';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="app-container">
      <YouTubeMp3Player />
    </div>
  </React.StrictMode>,
);
