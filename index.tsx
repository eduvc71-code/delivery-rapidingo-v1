import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const App = lazy(() => import('./App'));
const AppV2 = lazy(() => import('./AppV2'));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("No se encontró el elemento root");
}

const isV2 = new URLSearchParams(window.location.search).get('v') !== '1';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={<div className="min-h-dvh bg-brand-black" />}>
      {isV2 ? <AppV2 /> : <App />}
    </Suspense>
  </React.StrictMode>
);
