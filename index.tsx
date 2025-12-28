
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// FIX QUOTA EXCEEDED: Tentativo di pulizia preventiva se lo storage è corrotto o pieno
try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
} catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn("Storage pieno rilevato all'avvio. Eseguo pulizia automatica.");
        localStorage.clear();
        sessionStorage.clear();
    }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Impossibile trovare l'elemento root a cui montare l'applicazione");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);
