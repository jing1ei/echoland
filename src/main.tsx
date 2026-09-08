import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './pwa';
/* content cross-reference audit: dev warnings + the window hook the
   smoke suite calls. Costs nothing until something asks for it. */
import './content/audit';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/* Home-screen install + offline shell. Registered relative to the page so the
   build also works when it is served from a sub-directory. */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(() => {
      /* private mode, unsupported browser — the game runs fine without it */
    });
  });
}
