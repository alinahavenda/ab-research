import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import { initSession } from './utils/session';

// Always initialize session before React mounts so session_id and variant
// are present in localStorage before any component or hook executes.
initSession();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);7
