
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
    refundPlayerTickets: (playerId: string, playerName: string) => Promise<void>;
    refundAllGameTickets: () => Promise<void>;
    startGame: (targetDate?: string) => Promise<void>;
    endGame: () => Promise<void>;
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

    // AUTOMATIC EXTRACTION LOGIC
    useEffect(() => {
        const checkAutoExtraction = async () => {
            if (!config || config.status !== 'active') return;
            
            // Se esiste una data target e una data di inizio gioco
            if (config.targetDate && config.gameStartTime) {
                const startTime = new Date(config.gameStartTime).getTime();
                const targetTime = new Date(config.targetDate).getTime();
                const now = Date.now();
                const totalDuration = targetTime - startTime;
                
                // Se la durata è valida (positiva) e mancano numeri
                if (totalDuration > 0 && config.extractedNumbers.length < 90) {
                    const totalNumbers = 90;
                    const msPerNumber = totalDuration / totalNumbers;
                    
                    const elapsedTime = now - startTime;
                    // Calcola quanti numeri dovrebbero essere usciti teoricamente
                    const expectedCount = Math.min(90, Math.floor(elapsedTime / msPerNumber));
                    
                    // Se siamo indietro rispetto alla tabella di marcia, estrai
                    if (config.extractedNumbers.length < expectedCount) {
                        console.log("Auto Extraction Triggered. Expected:", expectedCount, "Current:", config.extractedNumbers.length);
                        await TombolaService.manualExtraction();
                    }
                }
            }
        };

        // Controlla ogni 10 secondi
        const interval = setInterval(checkAutoExtraction, 10000); 
        return () => clearInterval(interval);
    }, [config]);

    const buyTicket = async (playerId: string, playerName: string, quantity: number) => {
        await TombolaService.buyTicket(playerId, playerName, quantity);
    };

    const refundTicket = async (ticketId: string) => {
        await TombolaService.refundTicket(ticketId);
    };

    const refundPlayerTickets = async (playerId: string, playerName: string) => {
        await TombolaService.refundPlayerTickets(playerId, playerName);
    };

    const refundAllGameTickets = async () => {
        await TombolaService.refundAllGameTickets();
    };

    const startGame = async (targetDate?: string) => {
        await TombolaService.startGame(targetDate);
    };

    const endGame = async () => {
        await TombolaService.endGame();
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
            refundPlayerTickets,
            refundAllGameTickets,
            startGame,
            endGame,
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
