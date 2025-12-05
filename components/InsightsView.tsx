import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Order, Product, StaffMember } from '../types';

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
        "Qual è il prodotto più venduto in questo periodo?",
        "Quale operatore ha generato più incassi?",
        "Ci sono tendenze di vendita interessanti?",
        "Dammi 3 suggerimenti per migliorare le vendite.",
    ]);

    const handleQuery = async (userQuery: string) => {
        setIsLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API key non trovata. Assicurati che sia configurata correttamente.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const dataSummary = `
                Dati di vendita disponibili:
                - Numero totale di ordini: ${filteredOrders.length}
                - Incasso totale: €${filteredOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                - Periodo: dal ${filteredOrders.length > 0 ? new Date(filteredOrders[filteredOrders.length - 1].timestamp).toLocaleDateString('it-IT') : 'N/D'} al ${filteredOrders.length > 0 ? new Date(filteredOrders[0].timestamp).toLocaleDateString('it-IT') : 'N/D'}
                - Elenco prodotti: ${products.map(p => p.name).join(', ')}
                - Elenco personale: ${staff.map(s => s.name).join(', ')}
            `;
            
            const detailedOrders = filteredOrders.slice(0, 20).map(o => ({
                date: new Date(o.timestamp).toLocaleDateString('it-IT'),
                total: o.total,
                staff: o.staffName,
                items: o.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')
            }));
            
            const prompt = `
Sei un analista aziendale esperto specializzato nel settore della ristorazione. Il tuo compito è analizzare i dati di vendita di un bar e fornire approfondimenti chiari, concisi e utili in lingua italiana.

Ecco un riepilogo dei dati che stai analizzando:
${dataSummary}

Ecco alcuni esempi di ordini recenti (massimo 20):
${JSON.stringify(detailedOrders, null, 2)}

La richiesta dell'utente è: "${userQuery}"

Per favore, rispondi alla richiesta dell'utente basandoti ESCLUSIVAMENTE sui dati forniti. Sii breve, professionale e vai dritto al punto. Se i dati non sono sufficienti per rispondere, indicalo chiaramente. Formatta la tua risposta in modo chiaro e leggibile.
`;
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });

            if (response.text) {
                setAnalysis(response.text);
            } else {
                throw new Error("La risposta dell'API era vuota.");
            }

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Si è verificato un errore sconosciuto durante l'analisi.");
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
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Analisi Intelligente</h2>
                <p className="text-slate-600 mb-4">Poni una domanda sui dati filtrati e ottieni un'analisi istantanea.</p>
                
                <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Es. Qual è il prodotto più venduto?"
                        className="flex-grow bg-slate-100 text-slate-800 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-secondary"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !query.trim()} className="bg-secondary text-white font-bold py-3 px-6 rounded-md hover:bg-secondary-dark disabled:bg-slate-300 transition-colors">
                        {isLoading ? 'Analizzo...' : 'Chiedi'}
                    </button>
                </form>

                <div className="flex flex-wrap gap-2 mb-6">
                    <p className="text-sm font-semibold text-slate-500 mr-2">Suggerimenti:</p>
                    {suggestedQuestions.map(q => (
                        <button key={q} onClick={() => handleSuggestedClick(q)} disabled={isLoading} className="text-sm bg-slate-200 text-slate-700 px-3 py-1 rounded-full hover:bg-secondary hover:text-white transition-colors disabled:opacity-50">
                            {q}
                        </button>
                    ))}
                </div>

                {isLoading && (
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-slate-600">Analisi in corso...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
                        <p className="font-bold">Errore</p>
                        <p>{error}</p>
                    </div>
                )}

                {analysis && (
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-3">Risultati Analisi</h3>
                        <div className="prose prose-slate max-w-none whitespace-pre-wrap">
                            {analysis}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InsightsView;