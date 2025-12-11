
import { db } from '../firebaseConfig';
import { 
    doc, 
    collection, 
    onSnapshot, 
    setDoc, 
    runTransaction, 
    updateDoc, 
    deleteDoc,
    query, 
    getDocs,
    where,
    DocumentSnapshot,
    QuerySnapshot,
    writeBatch
} from 'firebase/firestore';
import { TombolaConfig, TombolaTicket, TombolaWin } from '../types';

const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const generateSingleTicket = () => {
    const ticket: number[] = [];
    const cols: number[][] = Array.from({ length: 9 }, () => []);
    for (let i = 0; i < 9; i++) {
        const start = i * 10 + 1;
        const end = i === 8 ? 90 : (i + 1) * 10;
        for(let n=start; n <= end; n++) if(i===0 && n>9) continue; else cols[i].push(n);
    }
    let numbersCount = 0;
    while(numbersCount < 15) {
        const colIdx = Math.floor(Math.random() * 9);
        if(cols[colIdx].length > 0) {
            const numIdx = Math.floor(Math.random() * cols[colIdx].length);
            const num = cols[colIdx][numIdx];
            if(!ticket.includes(num)) {
                ticket.push(num);
                cols[colIdx].splice(numIdx, 1);
                numbersCount++;
            }
        }
    }
    return ticket.sort((a,b) => a-b);
};

export const TombolaService = {
    subscribeToConfig: (onUpdate: (config: TombolaConfig) => void) => {
        return onSnapshot(doc(db, 'tombola', 'config'), (snapshot: DocumentSnapshot) => {
            if (snapshot.exists()) {
                onUpdate(snapshot.data() as TombolaConfig);
            } else {
                const initialConfig: TombolaConfig = { 
                    status: 'pending',
                    maxTickets: 168,
                    minTicketsToStart: 84,
                    ticketPriceSingle: 2,
                    ticketPriceBundle: 5,
                    jackpot: 0, 
                    lastExtraction: new Date().toISOString(), 
                    extractedNumbers: [] 
                };
                setDoc(doc(db, 'tombola', 'config'), initialConfig);
            }
        });
    },

    subscribeToTickets: (onUpdate: (tickets: TombolaTicket[]) => void) => {
        return onSnapshot(collection(db, 'tombola_tickets'), (snapshot: QuerySnapshot) => {
            const tickets = snapshot.docs.map(d => ({...d.data(), id: d.id} as TombolaTicket));
            onUpdate(tickets);
        });
    },

    subscribeToWins: (onUpdate: (wins: TombolaWin[]) => void) => {
        return onSnapshot(collection(db, 'tombola_wins'), (snapshot: QuerySnapshot) => {
            const wins = snapshot.docs.map(d => ({...d.data(), id: d.id} as TombolaWin));
            onUpdate(wins);
        });
    },

    buyTicket: async (playerId: string, playerName: string, quantity: number) => {
        try {
            await runTransaction(db, async (t) => {
                const configRef = doc(db, 'tombola', 'config');
                const configSnap = await t.get(configRef);
                if (!configSnap.exists()) throw new Error("Configurazione Tombola mancante");
                const currentConfig = configSnap.data() as TombolaConfig;

                let totalCost = 0;
                let pricePerTicket = 0;

                if (quantity === 6) {
                    totalCost = currentConfig.ticketPriceBundle;
                    pricePerTicket = totalCost / 6;
                } else {
                    totalCost = quantity * currentConfig.ticketPriceSingle;
                    pricePerTicket = currentConfig.ticketPriceSingle;
                }

                const revenue = totalCost * 0.20;
                const jackpotAdd = totalCost * 0.80;

                if (quantity === 6) {
                    const allNumbers = shuffleArray(Array.from({ length: 90 }, (_, i) => i + 1));
                    for (let i = 0; i < 6; i++) {
                        const ticketNumbers = allNumbers.slice(i * 15, (i + 1) * 15).sort((a: number, b: number) => a - b);
                        const ticketRef = doc(collection(db, 'tombola_tickets'));
                        t.set(ticketRef, { 
                            playerId, 
                            playerName, 
                            numbers: ticketNumbers, 
                            purchaseTime: new Date().toISOString(), 
                            pricePaid: pricePerTicket 
                        });
                    }
                } else {
                    for (let i = 0; i < quantity; i++) {
                        const ticketNumbers = generateSingleTicket();
                        const ticketRef = doc(collection(db, 'tombola_tickets'));
                        t.set(ticketRef, { 
                            playerId, 
                            playerName, 
                            numbers: ticketNumbers, 
                            purchaseTime: new Date().toISOString(),
                            pricePaid: pricePerTicket
                        });
                    }
                }
                
                t.update(configRef, { jackpot: (currentConfig.jackpot || 0) + jackpotAdd });
                
                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, { amount: totalCost, reason: `Tombola: ${quantity} cartelle (${playerName})`, timestamp: new Date().toISOString(), type: 'deposit', category: 'tombola' });
                
                const barCashRef = doc(collection(db, 'cash_movements'));
                t.set(barCashRef, { amount: revenue, reason: `Utile Tombola (20%)`, timestamp: new Date().toISOString(), type: 'deposit', category: 'bar' });
            });
        } catch (e) {
            console.error("TombolaService: Errore acquisto", e);
            throw e;
        }
    },

    refundTicket: async (ticketId: string) => {
        try {
            await runTransaction(db, async (t) => {
                const configRef = doc(db, 'tombola', 'config');
                const configSnap = await t.get(configRef);
                if (!configSnap.exists()) throw new Error("Configurazione Tombola mancante");
                const currentConfig = configSnap.data() as TombolaConfig;

                if (currentConfig.status === 'active' || currentConfig.status === 'completed') {
                    throw new Error("Impossibile annullare cartelle a gioco iniziato.");
                }

                const ticketRef = doc(db, 'tombola_tickets', ticketId);
                const ticketSnap = await t.get(ticketRef);
                if (!ticketSnap.exists()) throw new Error("Cartella non trovata");

                const ticketData = ticketSnap.data() as TombolaTicket;
                const refundAmount = ticketData.pricePaid !== undefined ? ticketData.pricePaid : currentConfig.ticketPriceSingle;
                const jackpotDeduction = refundAmount * 0.80;
                const revenueDeduction = refundAmount * 0.20;

                t.delete(ticketRef);
                t.update(configRef, { jackpot: Math.max(0, (currentConfig.jackpot || 0) - jackpotDeduction) });

                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, { amount: refundAmount, reason: "Rimborso Cartella (Annullamento)", timestamp: new Date().toISOString(), type: 'withdrawal', category: 'tombola' });

                const barCashRef = doc(collection(db, 'cash_movements'));
                t.set(barCashRef, { amount: revenueDeduction, reason: "Storno Utile Tombola (Rimborso)", timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' });
            });
        } catch (e) {
            console.error("TombolaService: Errore rimborso", e);
            throw e;
        }
    },

    refundPlayerTickets: async (playerId: string, playerName: string) => {
        try {
            // 1. Recupera i riferimenti fuori dalla transazione
            const q = query(collection(db, 'tombola_tickets'), where('playerId', '==', playerId));
            const querySnap = await getDocs(q);
            const ticketRefs = querySnap.docs.map(d => d.ref);

            if (ticketRefs.length === 0) return;

            await runTransaction(db, async (t) => {
                const configRef = doc(db, 'tombola', 'config');
                const configSnap = await t.get(configRef);
                const currentConfig = configSnap.data() as TombolaConfig;

                // 2. LEGGI TUTTI i documenti PRIMA di scrivere
                const ticketSnaps = await Promise.all(ticketRefs.map(ref => t.get(ref)));

                let totalRefund = 0;
                let totalRevenueDeduction = 0;
                let totalJackpotDeduction = 0;

                // 3. CALCOLA i totali basandoti sulle letture
                for (const ticketSnap of ticketSnaps) {
                    if(!ticketSnap.exists()) continue;
                    const tData = ticketSnap.data() as TombolaTicket;
                    const amount = tData.pricePaid !== undefined ? tData.pricePaid : currentConfig.ticketPriceSingle;
                    
                    totalRefund += amount;
                    totalRevenueDeduction += (amount * 0.20);
                    totalJackpotDeduction += (amount * 0.80);
                }

                // 4. ESEGUI TUTTE LE SCRITTURE
                for (const ticketSnap of ticketSnaps) {
                    if(ticketSnap.exists()) t.delete(ticketSnap.ref);
                }

                t.update(configRef, { jackpot: Math.max(0, (currentConfig.jackpot || 0) - totalJackpotDeduction) });

                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, { amount: totalRefund, reason: `Rimborso Totale (${playerName})`, timestamp: new Date().toISOString(), type: 'withdrawal', category: 'tombola' });

                const barCashRef = doc(collection(db, 'cash_movements'));
                t.set(barCashRef, { amount: totalRevenueDeduction, reason: `Storno Utile (${playerName})`, timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' });
            });

        } catch (e) {
            console.error("TombolaService: Errore rimborso massivo", e);
            throw e;
        }
    },

    // Reset totale della partita (Read All -> Write All pattern)
    refundAllGameTickets: async () => {
        try {
            const ticketsSnap = await getDocs(collection(db, 'tombola_tickets'));
            const ticketRefs = ticketsSnap.docs.map(d => d.ref);
            
            const winsSnap = await getDocs(collection(db, 'tombola_wins'));
            const winRefs = winsSnap.docs.map(d => d.ref);

            await runTransaction(db, async (t) => {
                // READ CONFIG
                const configRef = doc(db, 'tombola', 'config');
                // READ TICKETS
                const ticketDocs = await Promise.all(ticketRefs.map(ref => t.get(ref)));

                let totalRefund = 0;
                let totalRevenueDeduction = 0;

                ticketDocs.forEach(docSnap => {
                    if(docSnap.exists()) {
                        const tData = docSnap.data() as TombolaTicket;
                        const amount = tData.pricePaid || 2; 
                        totalRefund += amount;
                        totalRevenueDeduction += (amount * 0.20);
                    }
                });

                // WRITES
                ticketRefs.forEach(ref => t.delete(ref));
                winRefs.forEach(ref => t.delete(ref));

                t.update(configRef, { 
                    jackpot: 0, 
                    status: 'pending', 
                    extractedNumbers: [],
                    lastExtraction: new Date().toISOString(),
                    targetDate: null,
                    gameStartTime: null
                });

                if (totalRefund > 0) {
                    const cashRef = doc(collection(db, 'cash_movements'));
                    t.set(cashRef, { amount: totalRefund, reason: `ANNULLAMENTO TOMBOLA (Reset)`, timestamp: new Date().toISOString(), type: 'withdrawal', category: 'tombola' });

                    const barCashRef = doc(collection(db, 'cash_movements'));
                    t.set(barCashRef, { amount: totalRevenueDeduction, reason: `Storno Utile Tombola (Reset)`, timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' });
                }
            });
        } catch (e) {
            console.error("TombolaService: Errore annullamento totale", e);
            throw e;
        }
    },

    manualExtraction: async () => {
        try {
            await runTransaction(db, async (t) => {
                const configRef = doc(db, 'tombola', 'config');
                const configSnap = await t.get(configRef);
                const currentConfig = configSnap.data() as TombolaConfig;
                
                if (currentConfig.status !== 'active') return;
                if (!currentConfig.extractedNumbers) currentConfig.extractedNumbers = [];
                if (currentConfig.extractedNumbers.length >= 90) return;

                let nextNum;
                do { nextNum = Math.floor(Math.random() * 90) + 1; } while (currentConfig.extractedNumbers.includes(nextNum));
                
                const newExtracted = [...currentConfig.extractedNumbers, nextNum];
                
                const ticketsSnap = await getDocs(collection(db, 'tombola_tickets'));
                ticketsSnap.forEach(ticketDoc => {
                    const ticket = ticketDoc.data() as TombolaTicket;
                    if (!ticket.numbers) return;
                    
                    const matches = ticket.numbers.filter(n => newExtracted.includes(n));
                    const count = matches.length;
                    
                    if ([2,3,4,5,15].includes(count)) {
                        const type = count === 2 ? 'Ambo' : count === 3 ? 'Terno' : count === 4 ? 'Quaterna' : count === 5 ? 'Cinquina' : 'Tombola';
                        const winId = `${ticketDoc.id}_${type}`;
                        const specificWinRef = doc(db, 'tombola_wins', winId);
                        
                        t.set(specificWinRef, { 
                            ticketId: ticketDoc.id, 
                            playerName: ticket.playerName, 
                            type, 
                            numbers: matches, 
                            timestamp: new Date().toISOString() 
                        });
                    }
                });

                t.update(configRef, { lastExtraction: new Date().toISOString(), extractedNumbers: newExtracted });
            });
        } catch (e) {
            console.error("TombolaService: Errore estrazione", e);
        }
    },

    startGame: async (targetDate?: string) => {
        await updateDoc(doc(db, 'tombola', 'config'), { 
            status: 'active', 
            lastExtraction: new Date().toISOString(),
            gameStartTime: new Date().toISOString(),
            targetDate: targetDate || null
        });
    },

    endGame: async () => {
        await updateDoc(doc(db, 'tombola', 'config'), { 
            status: 'completed',
            targetDate: null
        });
    },

    updateConfig: async (cfg: Partial<TombolaConfig>) => {
        await setDoc(doc(db, 'tombola', 'config'), cfg, { merge: true });
    },

    transferFunds: async (amount: number) => {
        if (amount <= 0) return;
        try {
            await runTransaction(db, async (t) => {
                t.update(doc(db, 'tombola', 'config'), { jackpot: 0 });
                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, { amount: amount, reason: `Versamento utile Tombola`, timestamp: new Date().toISOString(), type: 'deposit', category: 'bar', isDeleted: false });
            });
        } catch (error) { 
            console.error("TombolaService: Error transferring funds", error); 
            throw error;
        }
    }
};
