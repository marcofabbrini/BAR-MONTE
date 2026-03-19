import { db } from '../firebaseConfig';
import { LotteryConfig, LotteryTicket } from '../types';

export const LotteryService = {
    subscribeToConfig: (onUpdate: (data: LotteryConfig | undefined) => void) => {
        return db.collection('settings').doc('lottery').onSnapshot((doc) => {
            if (doc.exists) {
                onUpdate(doc.data() as LotteryConfig);
            } else {
                onUpdate(undefined);
            }
        });
    },
    subscribeToTickets: (onUpdate: (data: LotteryTicket[]) => void) => {
        return db.collection('lottery_tickets').orderBy('purchaseTime', 'desc').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as LotteryTicket)));
        });
    },
    updateConfig: async (config: LotteryConfig) => {
        await db.collection('settings').doc('lottery').set(config);
    },
    buyTicket: async (ticket: Omit<LotteryTicket, 'id'>) => {
        await db.collection('lottery_tickets').add(ticket);
    },
    deleteTicket: async (id: string) => {
        await db.collection('lottery_tickets').doc(id).delete();
    }
};
