
import { db } from '../firebaseConfig';
import { AnalottoConfig, AnalottoBet, AnalottoExtraction, AnalottoWheel } from '../types';
import firebase from 'firebase/compat/app';

export const AnalottoService = {
    // --- LISTENERS ---
    
    subscribeToConfig: (onUpdate: (config: AnalottoConfig) => void) => {
        return db.collection('analotto').doc('config').onSnapshot((snapshot) => {
            if (snapshot.exists) {
                onUpdate(snapshot.data() as AnalottoConfig);
            } else {
                const initialConfig: AnalottoConfig = { 
                    jackpot: 0, 
                    lastExtraction: '',
                    rules: "Regolamento Analotto VVF:\n1. Si scelgono da 1 a 10 numeri.\n2. Si sceglie su quali ruote puntare.\n3. L'estrazione avviene settimanalmente.\n4. Il montepremi è costituito dall'80% delle giocate.",
                    extractionSchedule: "Ogni Venerdì sera"
                };
                db.collection('analotto').doc('config').set(initialConfig);
            }
        });
    },

    subscribeToBets: (onUpdate: (bets: AnalottoBet[]) => void) => {
        return db.collection('analotto_bets').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            const bets = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AnalottoBet));
            onUpdate(bets);
        });
    },

    subscribeToExtractions: (onUpdate: (extractions: AnalottoExtraction[]) => void) => {
        return db.collection('analotto_extractions').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            const extractions = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AnalottoExtraction));
            onUpdate(extractions);
        });
    },

    placeBet: async (bet: Omit<AnalottoBet, 'id' | 'timestamp'>) => {
        await db.runTransaction(async (t) => {
            const configRef = db.collection('analotto').doc('config');
            const configDoc = await t.get(configRef);
            const currentConfig = configDoc.data() as AnalottoConfig;

            const betRef = db.collection('analotto_bets').doc();
            t.set(betRef, {
                ...bet,
                timestamp: new Date().toISOString()
            });

            if (bet.status === 'active') {
                // Update Jackpot (80% of bet)
                const jackpotAdd = bet.amount * 0.8;
                const revenueAdd = bet.amount * 0.2;
                t.update(configRef, { jackpot: (currentConfig.jackpot || 0) + jackpotAdd });

                // Cash Movements
                const cashRef = db.collection('cash_movements').doc();
                t.set(cashRef, {
                    amount: bet.amount,
                    reason: `Analotto: Giocata ${bet.playerName}`,
                    timestamp: new Date().toISOString(),
                    type: 'deposit',
                    category: 'analotto'
                });

                const barCashRef = db.collection('cash_movements').doc();
                t.set(barCashRef, {
                    amount: revenueAdd,
                    reason: `Utile Analotto (20%)`,
                    timestamp: new Date().toISOString(),
                    type: 'deposit',
                    category: 'bar'
                });
            }
        });
    },

    confirmTicket: async (ticketId: string, numbers: number[], wheels: AnalottoWheel[]) => {
        await db.runTransaction(async (t) => {
            const ticketRef = db.collection('analotto_bets').doc(ticketId);
            const ticketDoc = await t.get(ticketRef);
            if (!ticketDoc.exists) throw new Error("Ticket not found");
            const ticket = ticketDoc.data() as AnalottoBet;

            if (ticket.status !== 'pending') throw new Error("Ticket already active");

            const configRef = db.collection('analotto').doc('config');
            const configDoc = await t.get(configRef);
            const currentConfig = configDoc.data() as AnalottoConfig;

            t.update(ticketRef, {
                status: 'active',
                numbers,
                wheels,
                timestamp: new Date().toISOString() // Update time to activation
            });

            // Update Jackpot
            const jackpotAdd = ticket.amount * 0.8;
            const revenueAdd = ticket.amount * 0.2;
            t.update(configRef, { jackpot: (currentConfig.jackpot || 0) + jackpotAdd });

            // Cash movements
            const cashRef = db.collection('cash_movements').doc();
            t.set(cashRef, {
                amount: ticket.amount,
                reason: `Analotto: Completamento Ticket ${ticket.playerName}`,
                timestamp: new Date().toISOString(),
                type: 'deposit',
                category: 'analotto'
            });

            const barCashRef = db.collection('cash_movements').doc();
            t.set(barCashRef, {
                amount: revenueAdd,
                reason: `Utile Analotto (20%)`,
                timestamp: new Date().toISOString(),
                type: 'deposit',
                category: 'bar'
            });
        });
    },

    runExtraction: async () => {
        const wheels: AnalottoWheel[] = ['APS', 'Campagnola', 'Autoscala', 'Autobotte', 'Direttivo'];
        const extractionData: any = {};
        
        wheels.forEach(w => {
            const nums: number[] = [];
            while(nums.length < 5) {
                const n = Math.floor(Math.random() * 90) + 1;
                if(!nums.includes(n)) nums.push(n);
            }
            extractionData[w] = nums.sort((a,b) => a-b);
        });

        await db.runTransaction(async (t) => {
            const configRef = db.collection('analotto').doc('config');
            
            const extractionRef = db.collection('analotto_extractions').doc();
            t.set(extractionRef, {
                timestamp: new Date().toISOString(),
                numbers: extractionData
            });

            t.update(configRef, { lastExtraction: new Date().toISOString() });
        });
    },

    updateConfig: async (cfg: Partial<AnalottoConfig>) => {
        await db.collection('analotto').doc('config').set(cfg, { merge: true });
    },

    transferFunds: async (amount: number) => {
        await db.runTransaction(async (t) => {
            const configRef = db.collection('analotto').doc('config');
            t.update(configRef, { jackpot: 0 });

            const cashRef = db.collection('cash_movements').doc();
            t.set(cashRef, {
                amount: amount,
                reason: `Versamento utile Analotto`,
                timestamp: new Date().toISOString(),
                type: 'deposit',
                category: 'bar',
                isDeleted: false
            });
        });
    }
};
