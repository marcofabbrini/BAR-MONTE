import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LotteryConfig, LotteryTicket } from '../types';
import { LotteryService } from '../services/lotteryService';

interface LotteryContextType {
    config?: LotteryConfig;
    tickets: LotteryTicket[];
    updateConfig: (config: LotteryConfig) => Promise<void>;
    buyTicket: (playerId: string, playerName: string, quantity: number) => Promise<void>;
    deleteTicket: (id: string) => Promise<void>;
}

const LotteryContext = createContext<LotteryContextType | undefined>(undefined);

export const LotteryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<LotteryConfig | undefined>(undefined);
    const [tickets, setTickets] = useState<LotteryTicket[]>([]);

    useEffect(() => {
        const unsubConfig = LotteryService.subscribeToConfig(setConfig);
        const unsubTickets = LotteryService.subscribeToTickets(setTickets);

        return () => {
            unsubConfig();
            unsubTickets();
        };
    }, []);

    const updateConfig = async (newConfig: LotteryConfig) => {
        await LotteryService.updateConfig(newConfig);
    };

    const buyTicket = async (playerId: string, playerName: string, quantity: number) => {
        if (!config || !config.isActive) return;
        
        // Find the next available ticket number
        const existingNumbers = tickets.map(t => t.ticketNumber);
        let nextNumber = 1;
        if (existingNumbers.length > 0) {
            nextNumber = Math.max(...existingNumbers) + 1;
        }

        for (let i = 0; i < quantity; i++) {
            const ticket: Omit<LotteryTicket, 'id'> = {
                playerId,
                playerName,
                ticketNumber: nextNumber + i,
                purchaseTime: new Date().toISOString(),
                pricePaid: config.ticketPrice
            };
            await LotteryService.buyTicket(ticket);
        }
    };

    const deleteTicket = async (id: string) => {
        await LotteryService.deleteTicket(id);
    };

    return (
        <LotteryContext.Provider value={{
            config, tickets, updateConfig, buyTicket, deleteTicket
        }}>
            {children}
        </LotteryContext.Provider>
    );
};

export const useLottery = () => {
    const context = useContext(LotteryContext);
    if (context === undefined) {
        throw new Error('useLottery must be used within a LotteryProvider');
    }
    return context;
};
