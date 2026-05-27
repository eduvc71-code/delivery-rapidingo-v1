import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppV2 from './AppV2';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("No se encontró el elemento root");
}

const isV2 = new URLSearchParams(window.location.search).get('v') !== '1';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isV2 ? <AppV2 /> : <App />}
  </React.StrictMode>
);
