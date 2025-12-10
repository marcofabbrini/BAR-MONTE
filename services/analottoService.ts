
import { db } from '../firebaseConfig';
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

export const AnalottoService = {
    // --- LISTENERS ---
    
    // Ascolta la configurazione
    subscribeToConfig: (onUpdate: (config: AnalottoConfig) => void) => {
        return onSnapshot(doc(db, 'analotto', 'config'), (snapshot: DocumentSnapshot) => {
            if (snapshot.exists()) {
                onUpdate(snapshot.data() as AnalottoConfig);
            } else {
                // Inizializzazione se non esiste
                const initialConfig: AnalottoConfig = { 
                    jackpot: 0, 
                    lastExtraction: '',
                    rules: "Regolamento Analotto VVF:\n1. Si scelgono da 1 a 10 numeri.\n2. Si sceglie su quali ruote puntare.\n3. L'estrazione avviene settimanalmente.\n4. Il montepremi è costituito dall'80% delle giocate.",
                    extractionSchedule: "Ogni Venerdì sera"
                };
                setDoc(doc(db, 'analotto', 'config'), initialConfig);
            }
        });
    },

    // Ascolta le scommesse
    subscribeToBets: (onUpdate: (bets: AnalottoBet[]) => void) => {
        const q = query(collection(db, 'analotto_bets'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot: QuerySnapshot) => {
            const bets = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AnalottoBet));
            onUpdate(bets);
        });
    },

    // Ascolta le estrazioni
    subscribeToExtractions: (onUpdate: (extractions: AnalottoExtraction[]) => void) => {
        const q = query(collection(db, 'analotto_extractions'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot: QuerySnapshot) => {
            const extractions = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AnalottoExtraction));
            onUpdate(extractions);
        });
    },

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
    }
};
