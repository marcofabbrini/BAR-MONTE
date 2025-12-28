
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// FIX QUOTA EXCEEDED: Tentativo di pulizia preventiva se lo storage è corrotto o pieno
// Also attempts to clear IndexedDB if possible on startup
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
            
            // Try to clear IndexedDB databases used by Firebase
            if (window.indexedDB && window.indexedDB.databases) {
                try {
                    const dbs = await window.indexedDB.databases();
                    for (const db of dbs) {
                        // Nuke common Firebase IndexedDB names
                        if(db.name && (
                            db.name.includes('firebase') || 
                            db.name.includes('firestore') || 
                            db.name.includes('gapi')
                        )) {
                            window.indexedDB.deleteDatabase(db.name);
                        }
                    }
                } catch(err) {
                    console.error("Failed to clear IndexedDB", err);
                }
            }
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
