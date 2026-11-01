
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Se lo storage del browser è pieno o corrotto, lo svuota all'avvio
async function tryClearStorage() {
    try {
        const testKey = '__test__';
        if (localStorage) {
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
        }
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn("Storage pieno rilevato all'avvio. Eseguo pulizia automatica.");
            localStorage.clear();
            sessionStorage.clear();
        }
    }
}

tryClearStorage();

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

// App installabile (PWA): il service worker non tocca mai le chiamate ai dati (/api/).
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker non registrato:', err));
  });
}
