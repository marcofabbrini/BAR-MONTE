
import { db } from '../firebaseConfig';
import { TombolaConfig, TombolaTicket, TombolaWin } from '../types';

// Helper per mescolare un array (necessario per generare le cartelle)
const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Helper per generare una cartella singola valida
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
    // --- LISTENERS ---

    subscribeToConfig: (onUpdate: (config: TombolaConfig) => void) => {
        return db.collection('tombola').doc('config').onSnapshot((snapshot) => {
            if (snapshot.exists) {
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
                db.collection('tombola').doc('config').set(initialConfig);
            }
        });
    },

    subscribeToTickets: (onUpdate: (tickets: TombolaTicket[]) => void) => {
        return db.collection('tombola_tickets').onSnapshot((snapshot) => {
            const tickets = snapshot.docs.map(d => ({...d.data(), id: d.id} as TombolaTicket));
            onUpdate(tickets);
        });
    },

    subscribeToWins: (onUpdate: (wins: TombolaWin[]) => void) => {
        return db.collection('tombola_wins').onSnapshot((snapshot) => {
            const wins = snapshot.docs.map(d => ({...d.data(), id: d.id} as TombolaWin));
            onUpdate(wins);
        });
    },

    // --- ACTIONS ---

    buyTicket: async (playerId: string, playerName: string, quantity: number) => {
        try {
            await db.runTransaction(async (t) => {
                const configRef = db.collection('tombola').doc('config');
                const configSnap = await t.get(configRef);
                if (!configSnap.exists) throw new Error("Configurazione Tombola mancante");
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

                // Generazione Cartelle
                if (quantity === 6) {
                    const allNumbers = shuffleArray(Array.from({ length: 90 }, (_, i) => i + 1));
                    for (let i = 0; i < 6; i++) {
                        const ticketNumbers = allNumbers.slice(i * 15, (i + 1) * 15).sort((a: number, b: number) => a - b);
                        const ticketRef = db.collection('tombola_tickets').doc();
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
                        const ticketRef = db.collection('tombola_tickets').doc();
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
                
                const cashRef = db.collection('cash_movements').doc();
                t.set(cashRef, { 
                    amount: totalCost, 
                    reason: `Tombola: ${quantity} cartelle (${playerName})`, 
                    timestamp: new Date().toISOString(), 
                    type: 'deposit', 
                    category: 'tombola' 
                });
                
                const barCashRef = db.collection('cash_movements').doc();
                t.set(barCashRef, { 
                    amount: revenue, 
                    reason: `Utile Tombola (20%)`, 
                    timestamp: new Date().toISOString(), 
                    type: 'deposit', 
                    category: 'bar' 
                });
            });
        } catch (e) {
            console.error("TombolaService: Errore acquisto", e);
            throw e;
        }
    },

    refundTicket: async (ticketId: string) => {
        try {
            await db.runTransaction(async (t) => {
                const configRef = db.collection('tombola').doc('config');
                const configSnap = await t.get(configRef);
                if (!configSnap.exists) throw new Error("Configurazione Tombola mancante");
                const currentConfig = configSnap.data() as TombolaConfig;

                if (currentConfig.status === 'active' || currentConfig.status === 'completed') {
                    throw new Error("Impossibile annullare cartelle a gioco iniziato.");
                }

                const ticketRef = db.collection('tombola_tickets').doc(ticketId);
                const ticketSnap = await t.get(ticketRef);
                if (!ticketSnap.exists) throw new Error("Cartella non trovata");

                const ticketData = ticketSnap.data() as TombolaTicket;
                const refundAmount = ticketData.pricePaid !== undefined ? ticketData.pricePaid : currentConfig.ticketPriceSingle;
                const jackpotDeduction = refundAmount * 0.80;
                const revenueDeduction = refundAmount * 0.20;

                t.delete(ticketRef);
                t.update(configRef, { jackpot: Math.max(0, (currentConfig.jackpot || 0) - jackpotDeduction) });

                const cashRef = db.collection('cash_movements').doc();
                t.set(cashRef, { amount: refundAmount, reason: "Rimborso Cartella (Annullamento)", timestamp: new Date().toISOString(), type: 'withdrawal', category: 'tombola' });

                const barCashRef = db.collection('cash_movements').doc();
                t.set(barCashRef, { amount: revenueDeduction, reason: "Storno Utile Tombola (Rimborso)", timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' });
            });
        } catch (e) {
            console.error("TombolaService: Errore rimborso", e);
            throw e;
        }
    },

    manualExtraction: async () => {
        try {
            await db.runTransaction(async (t) => {
                const configRef = db.collection('tombola').doc('config');
                const configSnap = await t.get(configRef);
                const currentConfig = configSnap.data() as TombolaConfig;
                
                if (currentConfig.status !== 'active') return;
                if (!currentConfig.extractedNumbers) currentConfig.extractedNumbers = [];
                if (currentConfig.extractedNumbers.length >= 90) return;

                let nextNum;
                do { nextNum = Math.floor(Math.random() * 90) + 1; } while (currentConfig.extractedNumbers.includes(nextNum));
                
                const newExtracted = [...currentConfig.extractedNumbers, nextNum];
                
                // Fetch tickets outside of transaction or assume small dataset? 
                // Firestore transaction requires reads before writes. 
                // Reading ALL tickets might be too much. 
                // But for VVF Tombola (max 168 tickets), it's fine.
                const ticketsSnap = await t.get(db.collection('tombola_tickets'));
                
                ticketsSnap.forEach(ticketDoc => {
                    const ticket = ticketDoc.data() as TombolaTicket;
                    if (!ticket.numbers) return;
                    
                    const matches = ticket.numbers.filter(n => newExtracted.includes(n));
                    const count = matches.length;
                    
                    if ([2,3,4,5,15].includes(count)) {
                        const type = count === 2 ? 'Ambo' : count === 3 ? 'Terno' : count === 4 ? 'Quaterna' : count === 5 ? 'Cinquina' : 'Tombola';
                        
                        // Note: ideally check if already won this type
                        const winRef = db.collection('tombola_wins').doc();
                        t.set(winRef, { 
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

    startGame: async () => {
        await db.collection('tombola').doc('config').update({ 
            status: 'active', 
            lastExtraction: new Date().toISOString() 
        });
    },

    updateConfig: async (cfg: Partial<TombolaConfig>) => {
        await db.collection('tombola').doc('config').set(cfg, { merge: true });
    },

    transferFunds: async (amount: number) => {
        if (amount <= 0) return;
        try {
            await db.runTransaction(async (t) => {
                t.update(db.collection('tombola').doc('config'), { jackpot: 0 });
                const cashRef = db.collection('cash_movements').doc();
                t.set(cashRef, { 
                    amount: amount, 
                    reason: `Versamento utile Tombola`, 
                    timestamp: new Date().toISOString(), 
                    type: 'deposit', 
                    category: 'bar', 
                    isDeleted: false 
                });
            });
        } catch (error) { 
            console.error("TombolaService: Error transferring funds", error); 
            throw error;
        }
    }
};
