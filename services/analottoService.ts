
import { db } from '../firebaseConfig';
<<<<<<< HEAD
import { AnalottoConfig, AnalottoBet, AnalottoExtraction, AnalottoWheel } from '../types';
import firebase from 'firebase/compat/app';
=======
import { 
    doc, 
    collection, 
    onSnapshot, 
    setDoc, 
    runTransaction, 
    addDoc, 
    updateDoc, 
    query, 
    orderBy,
    FirestoreError,
    DocumentSnapshot,
    QuerySnapshot
} from 'firebase/firestore';
import { AnalottoConfig, AnalottoBet, AnalottoExtraction, AnalottoWheel } from '../types';
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894

export const AnalottoService = {
    // --- LISTENERS ---
    
<<<<<<< HEAD
    subscribeToConfig: (onUpdate: (config: AnalottoConfig) => void) => {
        return db.collection('analotto').doc('config').onSnapshot((snapshot) => {
            if (snapshot.exists) {
                onUpdate(snapshot.data() as AnalottoConfig);
            } else {
=======
    // Ascolta la configurazione
    subscribeToConfig: (onUpdate: (config: AnalottoConfig) => void) => {
        return onSnapshot(doc(db, 'analotto', 'config'), (snapshot: DocumentSnapshot) => {
            if (snapshot.exists()) {
                onUpdate(snapshot.data() as AnalottoConfig);
            } else {
                // Inizializzazione se non esiste
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
                const initialConfig: AnalottoConfig = { 
                    jackpot: 0, 
                    lastExtraction: '',
                    rules: "Regolamento Analotto VVF:\n1. Si scelgono da 1 a 10 numeri.\n2. Si sceglie su quali ruote puntare.\n3. L'estrazione avviene settimanalmente.\n4. Il montepremi è costituito dall'80% delle giocate.",
                    extractionSchedule: "Ogni Venerdì sera"
                };
<<<<<<< HEAD
                db.collection('analotto').doc('config').set(initialConfig);
=======
                setDoc(doc(db, 'analotto', 'config'), initialConfig);
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
            }
        });
    },

<<<<<<< HEAD
    subscribeToBets: (onUpdate: (bets: AnalottoBet[]) => void) => {
        return db.collection('analotto_bets').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
=======
    // Ascolta le scommesse
    subscribeToBets: (onUpdate: (bets: AnalottoBet[]) => void) => {
        const q = query(collection(db, 'analotto_bets'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot: QuerySnapshot) => {
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
            const bets = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AnalottoBet));
            onUpdate(bets);
        });
    },

<<<<<<< HEAD
    subscribeToExtractions: (onUpdate: (extractions: AnalottoExtraction[]) => void) => {
        return db.collection('analotto_extractions').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
=======
    // Ascolta le estrazioni
    subscribeToExtractions: (onUpdate: (extractions: AnalottoExtraction[]) => void) => {
        const q = query(collection(db, 'analotto_extractions'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot: QuerySnapshot) => {
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
            const extractions = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AnalottoExtraction));
            onUpdate(extractions);
        });
    },

<<<<<<< HEAD
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
=======
    // --- ACTIONS ---

    // Piazza una scommessa (Transazione complessa: Scommessa + Jackpot + Cassa)
    placeBet: async (betData: Omit<AnalottoBet, 'id' | 'timestamp'>) => {
        try {
            await runTransaction(db, async (t) => {
                const configRef = doc(db, 'analotto', 'config');
                const configSnap = await t.get(configRef); // Read First
                
                // Se non esiste la config, la creiamo al volo dentro la transazione per evitare crash
                let currentJackpot = 0;
                if (configSnap.exists()) {
                    currentJackpot = configSnap.data().jackpot || 0;
                } else {
                    t.set(configRef, { jackpot: 0 }); // Fallback
                }

                // 1. Crea Scommessa
                const betRef = doc(collection(db, 'analotto_bets'));
                t.set(betRef, { ...betData, timestamp: new Date().toISOString() });

                // 2. Calcola ripartizione
                const jackpotPart = betData.amount * 0.8;
                const barPart = betData.amount * 0.2;

                // 3. Aggiorna Jackpot
                t.set(configRef, { jackpot: currentJackpot + jackpotPart }, { merge: true });

                // 4. Registra movimento cassa Analotto (Incasso Lordo)
                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, { 
                    amount: betData.amount, 
                    reason: `Analotto: Giocata (${betData.playerName})`, 
                    timestamp: new Date().toISOString(), 
                    type: 'deposit', 
                    category: 'analotto' 
                });
                
                // 5. Registra utile Bar (20%)
                const barCashRef = doc(collection(db, 'cash_movements'));
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

    // Conferma un ticket "pending" (acquistato in cassa)
    confirmTicket: async (ticketId: string, numbers: number[], wheels: AnalottoWheel[]) => {
        try {
            await updateDoc(doc(db, 'analotto_bets', ticketId), {
                numbers,
                wheels,
                status: 'active'
            });
        } catch (e) {
            console.error("AnalottoService: Errore conferma ticket", e);
            throw e;
        }
    },

    // Esegui Estrazione
    runExtraction: async () => {
        try {
            const wheels: AnalottoWheel[] = ['APS', 'Campagnola', 'Autoscala', 'Autobotte', 'Direttivo'];
            const extractionData: Record<string, number[]> = {};
            
            wheels.forEach(wheel => {
                const nums = new Set<number>();
                while(nums.size < 5) nums.add(Math.floor(Math.random() * 90) + 1);
                extractionData[wheel] = Array.from(nums);
            });

            await addDoc(collection(db, 'analotto_extractions'), { 
                timestamp: new Date().toISOString(), 
                numbers: extractionData 
            });
            
            await updateDoc(doc(db, 'analotto', 'config'), { 
                lastExtraction: new Date().toISOString() 
            });
        } catch (e) {
            console.error("AnalottoService: Errore estrazione", e);
            throw e;
        }
    },

    // Aggiorna configurazione (Regole, Orari)
    updateConfig: async (newConfig: Partial<AnalottoConfig>) => {
        await setDoc(doc(db, 'analotto', 'config'), newConfig, { merge: true });
    },

    // Trasferimento fondi (Reset Jackpot -> Cassa Bar)
    transferFunds: async (amount: number) => {
        if (amount <= 0) return;
        try {
            await runTransaction(db, async (t) => {
                t.update(doc(db, 'analotto', 'config'), { jackpot: 0 });
                
                const cashRef = doc(collection(db, 'cash_movements'));
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
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
    }
};
