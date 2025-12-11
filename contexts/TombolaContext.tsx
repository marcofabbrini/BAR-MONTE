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
    startGame: (targetDate?: string) => Promise<void>;
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
            
            // Se abbiamo una data target e una data inizio
            if (config.targetDate && config.gameStartTime) {
                const startTime = new Date(config.gameStartTime).getTime();
                const targetTime = new Date(config.targetDate).getTime();
                const now = Date.now();
                const totalDuration = targetTime - startTime;
                
                // Se la durata è valida e il gioco non è finito
                if (totalDuration > 0 && config.extractedNumbers.length < 90) {
                    const totalNumbers = 90;
                    const msPerNumber = totalDuration / totalNumbers;
                    
                    // Quanti numeri dovrebbero essere usciti teoricamente ad ora?
                    // Esempio: sono passati 1000ms, msPerNum = 100 -> dovrebbero essere usciti 10 numeri
                    const elapsedTime = now - startTime;
                    const expectedCount = Math.min(90, Math.floor(elapsedTime / msPerNumber));
                    
                    // Se ne sono usciti meno del previsto, estrai!
                    if (config.extractedNumbers.length < expectedCount) {
                        console.log("Auto Extraction Triggered: Expected", expectedCount, "Current", config.extractedNumbers.length);
                        await TombolaService.manualExtraction();
                    }
                }
            } else {
                // Fallback vecchia logica (es. se manca targetDate, estrazione manuale o lenta)
                // Qui lasciamo solo la nuova logica temporizzata se configurata
            }
        };

        const interval = setInterval(checkAutoExtraction, 10000); // Check every 10 seconds
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

    const startGame = async (targetDate?: string) => {
        await TombolaService.startGame(targetDate);
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