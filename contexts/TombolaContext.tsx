
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TombolaConfig, TombolaTicket, TombolaWin } from '../types';
import { TombolaService } from '../services/tombolaService';

interface TombolaContextType {
    config: TombolaConfig | undefined;
    tickets: TombolaTicket[];
    wins: TombolaWin[];
    isLoading: boolean;
    buyTicket: (playerId: string, playerName: string, quantity: number) => Promise<void>;
    refundTicket: (ticketId: string) => Promise<void>;
    startGame: () => Promise<void>;
    manualExtraction: () => Promise<void>;
    updateConfig: (cfg: Partial<TombolaConfig>) => Promise<void>;
    transferFunds: (amount: number) => Promise<void>;
}

const TombolaContext = createContext<TombolaContextType | undefined>(undefined);

export const TombolaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<TombolaConfig | undefined>(undefined);
    const [tickets, setTickets] = useState<TombolaTicket[]>([]);
    const [wins, setWins] = useState<TombolaWin[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Listeners
    useEffect(() => {
        const unsubConfig = TombolaService.subscribeToConfig(setConfig);
        const unsubTickets = TombolaService.subscribeToTickets(setTickets);
        const unsubWins = TombolaService.subscribeToWins(setWins);

        setIsLoading(false);

        return () => {
            unsubConfig();
            unsubTickets();
            unsubWins();
        };
    }, []);

    // Automatic Extraction Timer Logic (Moved from App.tsx)
    useEffect(() => {
        const runTombolaExtraction = async () => {
            if (!config || !config.extractedNumbers || config.extractedNumbers.length >= 90) return;
            if (config.status !== 'active') return;
            
            const now = new Date().getTime();
            const last = new Date(config.lastExtraction).getTime();
            // Estrai ogni 60 secondi se l'ultima estrazione è vecchia di almeno 2 ore (logic legacy)
            // Oppure logica personalizzata: qui manteniamo la logica originale
            const diffHours = (now - last) / (1000 * 60 * 60);
            
            if (diffHours >= 2) {
                await TombolaService.manualExtraction();
            }
        };
        const interval = setInterval(runTombolaExtraction, 60000);
        return () => clearInterval(interval);
    }, [config]);

    const buyTicket = async (playerId: string, playerName: string, quantity: number) => {
        await TombolaService.buyTicket(playerId, playerName, quantity);
    };

    const refundTicket = async (ticketId: string) => {
        await TombolaService.refundTicket(ticketId);
    };

    const startGame = async () => {
        await TombolaService.startGame();
    };

    const manualExtraction = async () => {
        await TombolaService.manualExtraction();
    };

    const updateConfig = async (cfg: Partial<TombolaConfig>) => {
        await TombolaService.updateConfig(cfg);
    };

    const transferFunds = async (amount: number) => {
        await TombolaService.transferFunds(amount);
    };

    return (
        <TombolaContext.Provider value={{
            config,
            tickets,
            wins,
            isLoading,
            buyTicket,
            refundTicket,
            startGame,
            manualExtraction,
            updateConfig,
            transferFunds
        }}>
            {children}
        </TombolaContext.Provider>
    );
};

export const useTombola = () => {
    const context = useContext(TombolaContext);
    if (context === undefined) {
        throw new Error('useTombola must be used within a TombolaProvider');
    }
    return context;
};
