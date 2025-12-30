
import { db } from '../firebaseConfig';
import { AnalottoConfig, AnalottoBet, AnalottoExtraction, AnalottoWheel } from '../types';

export const AnalottoService = {
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

    placeBet: async (betData: Omit<AnalottoBet, 'id' | 'timestamp'>) => {
        try {
            await db.runTransaction(async (t) => {
                const configRef = db.collection('analotto').doc('config');
                const configSnap = await t.get(configRef);
                
                let currentJackpot = 0;
                if (configSnap.exists) {
                    currentJackpot = configSnap.data()?.jackpot || 0;
                } else {
                    t.set(configRef, { jackpot: 0 });
                }

                const betRef = db.collection('analotto_bets').doc();
                t.set(betRef, { ...betData, timestamp: new Date().toISOString() });

                const jackpotPart = betData.amount * 0.8;
                const barPart = betData.amount * 0.2;

                t.set(configRef, { jackpot: currentJackpot + jackpotPart }, { merge: true });

                const cashRef = db.collection('cash_movements').doc();
                t.set(cashRef, { 
                    amount: betData.amount, 
                    reason: `Analotto: Giocata (${betData.playerName})`, 
                    timestamp: new Date().toISOString(), 
                    type: 'deposit', 
                    category: 'analotto' 
                });
                
                const barCashRef = db.collection('cash_movements').doc();
                t.set(barCashRef, { 
                    amount: barPart, 
                    reason: `Utile Analotto (20%)`, 
                    timestamp: new Date().toISOString(), 
                    type: 'deposit', 
                    category: 'bar' 
                });
            });
        } catch (e) {
            console.error("AnalottoService: Errore piazzamento scommessa", e);
            throw e;
        }
    },

    confirmTicket: async (ticketId: string, numbers: number[], wheels: AnalottoWheel[]) => {
        try {
            await db.collection('analotto_bets').doc(ticketId).update({
                numbers,
                wheels,
                status: 'active'
            });
        } catch (e) {
            console.error("AnalottoService: Errore conferma ticket", e);
            throw e;
        }
    },

    runExtraction: async () => {
        try {
            const wheels: AnalottoWheel[] = ['APS', 'Campagnola', 'Autoscala', 'Autobotte', 'Direttivo'];
            const extractionData: Record<string, number[]> = {};
            
            wheels.forEach(wheel => {
                const nums = new Set<number>();
                while(nums.size < 5) nums.add(Math.floor(Math.random() * 90) + 1);
                extractionData[wheel] = Array.from(nums);
            });

            await db.collection('analotto_extractions').add({ 
                timestamp: new Date().toISOString(), 
                numbers: extractionData 
            });
            
            await db.collection('analotto').doc('config').update({ 
                lastExtraction: new Date().toISOString() 
            });
        } catch (e) {
            console.error("AnalottoService: Errore estrazione", e);
            throw e;
        }
    },

    updateConfig: async (newConfig: Partial<AnalottoConfig>) => {
        await db.collection('analotto').doc('config').set(newConfig, { merge: true });
    },

    transferFunds: async (amount: number) => {
        if (amount <= 0) return;
        try {
            await db.runTransaction(async (t) => {
                t.update(db.collection('analotto').doc('config'), { jackpot: 0 });
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
        } catch (e) {
            console.error("AnalottoService: Errore trasferimento fondi", e);
            throw e;
        }
    }
};
