import { GoogleGenAI } from "@google/genai";

// Questa è una funzione serverless. La firma esatta può variare 
// a seconda della piattaforma di hosting (Vercel, Netlify, etc.).
// Questo esempio usa una firma comune compatibile con Vercel.

// Definiamo tipi semplici per richiesta e risposta per chiarezza
interface RequestBody {
    prompt: string;
}

interface ApiResponse {
    setHeader(key: string, value: string | string[]): void;
    status(code: number): { json(data: { message?: string; analysis?: string }): void; };
}

interface ApiRequest {
    method?: string;
    body: RequestBody;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }

    try {
        // IMPORTANTE: La chiave API deve essere impostata come variabile d'ambiente
        // sulla tua piattaforma di hosting (es. Vercel). NON deve essere scritta qui.
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error("La variabile d'ambiente API_KEY non è impostata sul server.");
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ message: 'Il prompt è richiesto nel corpo della richiesta.' });
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        if (response.text) {
             return res.status(200).json({ analysis: response.text });
        } else {
             return res.status(500).json({ message: "L'API ha restituito una risposta vuota."});
        }
       
    } catch (error) {
        console.error("Errore nella chiamata all'API Gemini:", error);
        return res.status(500).json({ message: error instanceof Error ? error.message : 'Si è verificato un errore interno del server.' });
    }
}
