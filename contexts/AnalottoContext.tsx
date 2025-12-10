
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AnalottoConfig, AnalottoBet, AnalottoExtraction, AnalottoWheel } from '../types';
import { AnalottoService } from '../services/analottoService';

interface AnalottoContextType {
    config: AnalottoConfig | undefined;
    bets: AnalottoBet[];
    extractions: AnalottoExtraction[];
    isLoading: boolean;
    placeBet: (bet: Omit<AnalottoBet, 'id' | 'timestamp'>) => Promise<void>;
    confirmTicket: (ticketId: string, numbers: number[], wheels: AnalottoWheel[]) => Promise<void>;
    runExtraction: () => Promise<void>;
    updateConfig: (cfg: Partial<AnalottoConfig>) => Promise<void>;
    transferFunds: (amount: number) => Promise<void>;
}

const AnalottoContext = createContext<AnalottoContextType | undefined>(undefined);

export const AnalottoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<AnalottoConfig | undefined>(undefined);
    const [bets, setBets] = useState<AnalottoBet[]>([]);
    const [extractions, setExtractions] = useState<AnalottoExtraction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubConfig = AnalottoService.subscribeToConfig(setConfig);
        const unsubBets = AnalottoService.subscribeToBets(setBets);
        const unsubExtractions = AnalottoService.subscribeToExtractions(setExtractions);

        setIsLoading(false);

        return () => {
            unsubConfig();
            unsubBets();
            unsubExtractions();
        };
    }, []);

    const placeBet = async (bet: Omit<AnalottoBet, 'id' | 'timestamp'>) => {
        await AnalottoService.placeBet(bet);
    };

    const confirmTicket = async (ticketId: string, numbers: number[], wheels: AnalottoWheel[]) => {
        await AnalottoService.confirmTicket(ticketId, numbers, wheels);
    };

    const runExtraction = async () => {
        await AnalottoService.runExtraction();
    };

    const updateConfig = async (cfg: Partial<AnalottoConfig>) => {
        await AnalottoService.updateConfig(cfg);
    };

    const transferFunds = async (amount: number) => {
        await AnalottoService.transferFunds(amount);
    };

    return (
        <AnalottoContext.Provider value={{
            config,
            bets,
            extractions,
            isLoading,
            placeBet,
            confirmTicket,
            runExtraction,
            updateConfig,
            transferFunds
        }}>
            {children}
        </AnalottoContext.Provider>
    );
};

export const useAnalotto = () => {
    const context = useContext(AnalottoContext);
    if (context === undefined) {
        throw new Error('useAnalotto must be used within an AnalottoProvider');
    }
    return context;
};
