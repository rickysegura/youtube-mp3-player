import React from 'react';
import ReactDOM from 'react-dom/client';
import YouTubeMp3Player from './YouTubeMp3Player';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="app-container">
      {/* Top-left corner */}
      <div className="flex items-start justify-start">
        {/* <YouTubeMp3Player /> */}
      </div>

      {/* Top-right corner */}
      <div className="flex items-start justify-end">
        {/* <YouTubeMp3Player /> */}
      </div>

      {/* Bottom-left corner */}
      <div className="flex items-end justify-start">
        {/* <YouTubeMp3Player /> */}
      </div>

      {/* Bottom-right corner */}
      <div className="flex items-end justify-end">
        <YouTubeMp3Player />
      </div>
    </div>
  </React.StrictMode>,
);
