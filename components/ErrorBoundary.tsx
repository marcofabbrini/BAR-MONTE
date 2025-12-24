import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null
    };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-6 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-red-500">
                        <h1 className="text-2xl font-black text-slate-800 mb-4">Qualcosa è andato storto 😕</h1>
                        <p className="text-slate-600 mb-4 text-sm">
                            Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
                        </p>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-left mb-6 overflow-auto max-h-40">
                            <code className="text-xs text-red-600 font-mono break-all">
                                {this.state.error?.message || 'Errore sconosciuto'}
                            </code>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors"
                            >
                                Ricarica Pagina
                            </button>
                            <button 
                                onClick={() => { localStorage.clear(); window.location.reload(); }}
                                className="flex-1 bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200 transition-colors"
                            >
                                Reset Cache
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;