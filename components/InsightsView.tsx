import React, { useState } from 'react';
import { Order, Product, StaffMember } from '../types';
import { GoogleGenAI } from "@google/genai";

interface InsightsViewProps {
    filteredOrders: Order[];
    products: Product[];
    staff: StaffMember[];
}

const InsightsView: React.FC<InsightsViewProps> = ({ filteredOrders, products, staff }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [suggestedQuestions] = useState([
        "C'è qualche prodotto in esaurimento?",
        "Chi ha lavorato meglio oggi?",
        "Qual è l'orario di un turno 12/24?",
        "Quali sono i gradi VVF?",
        "Dammi una ricetta per un cocktail"
    ]);

    const handleQuery = async (userQuery: string) => {
        setIsLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const dataSummary = `
                DATI BAR ATTUALI (Filtro Attivo):
                - Numero transazioni: ${filteredOrders.length}
                - Incasso totale periodo: €${filteredOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                - Data Inizio Filtro: ${filteredOrders.length > 0 ? new Date(filteredOrders[filteredOrders.length - 1].timestamp).toLocaleDateString('it-IT') : 'N/D'}
                - Data Fine Filtro: ${filteredOrders.length > 0 ? new Date(filteredOrders[0].timestamp).toLocaleDateString('it-IT') : 'N/D'}
                - Lista Prodotti nel sistema: ${products.map(p => `${p.name} (Stock: ${p.stock})`).join(', ')}
                - Personale: ${staff.map(s => `${s.name} (Turno ${s.shift})`).join(', ')}
            `;
            
            const detailedOrders = filteredOrders.slice(0, 20).map(o => ({
                date: new Date(o.timestamp).toLocaleDateString('it-IT'),
                time: new Date(o.timestamp).toLocaleTimeString('it-IT'),
                total: o.total,
                staff: o.staffName,
                items: o.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')
            }));
            
            const fullPrompt = `
Sei Mario, un vigile del fuoco veterano e simpatico, ma anche l'assistente virtuale del Bar VVF.
Il tuo compito è rispondere alle domande dell'utente. 

Hai due ruoli principali:
1. **Analista del Bar**: Usa i dati forniti qui sotto per rispondere a domande su vendite, prodotti, incassi e personale.
2. **Esperto VVF**: Usa la tua conoscenza generale (pre-addestrata) per rispondere a domande su turni, regolamenti, gradi, normative, procedure operative, mezzi di soccorso, uffici e vita di caserma.

DATI BAR DISPONIBILI:
${dataSummary}

ULTIMI ORDINI (Campione):
${JSON.stringify(detailedOrders, null, 2)}

DOMANDA UTENTE: "${userQuery}"

LINEE GUIDA RISPOSTA:
- Parla come un collega pompiere esperto e amichevole (usa termini come "collega", "ragazzi", "capo").
- Se la domanda riguarda il bar, usa i dati forniti. Sii preciso sui numeri.
- Se la domanda riguarda i VVF o altro, rispondi con competenza.
- Se ti chiedono un consiglio, sii propositivo.
- Sii conciso ma esaustivo.
- Usa qualche emoji a tema (🚒, 🔥, ☕).
`;
            
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                throw new Error("API Key mancante.");
            }

            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
            });

            if (response.text) {
                setAnalysis(response.text);
            } else {
                throw new Error("Mario è impegnato in intervento e non ha risposto.");
            }

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Errore di comunicazione con Mario.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            handleQuery(query);
        }
    };
    
    const handleSuggestedClick = (question: string) => {
        setQuery(question);
        handleQuery(question);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-red-600 relative overflow-hidden">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-200 shadow-sm flex-shrink-0">
                        <span className="text-4xl filter drop-shadow-sm">👨‍🚒</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Chiedi a Mario</h2>
                        <p className="text-slate-500 font-medium text-sm leading-tight">Il tuo assistente virtuale VVF. Chiedimi del bar, dei turni o di normative!</p>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Es. Quanti caffè abbiamo venduto? Oppure: Come funziona il salto?"
                        className="flex-grow bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-inner font-medium placeholder:text-slate-400"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !query.trim()} className="bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-700 disabled:bg-slate-300 transition-all shadow-md active:translate-y-0.5">
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        )}
                    </button>
                </form>

                <div className="flex flex-wrap gap-2 mb-6">
                    {suggestedQuestions.map(q => (
                        <button key={q} onClick={() => handleSuggestedClick(q)} disabled={isLoading} className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent transition-all disabled:opacity-50">
                            {q}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm mb-4 animate-fade-in">
                        <p className="font-bold flex items-center gap-2">⚠️ Errore Radio</p>
                        <p>{error}</p>
                    </div>
                )}

                {analysis && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-fade-in shadow-inner relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-400 to-orange-400 rounded-l-2xl"></div>
                        <h3 className="text-sm font-black text-slate-400 uppercase mb-3 tracking-widest">Risposta di Mario</h3>
                        <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap font-medium text-slate-700">
                            {analysis}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InsightsView;