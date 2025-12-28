
import { Product, Till, StaffMember } from './types';

export const TILLS: Till[] = [
    { id: 'TA', name: 'Cassa TA', shift: 'a' },
    { id: 'TB', name: 'Cassa TB', shift: 'b' },
    { id: 'TC', name: 'Cassa TC', shift: 'c' },
    { id: 'TD', name: 'Cassa TD', shift: 'd' },
];

// Dati iniziali per i prodotti
export const INITIAL_MENU_ITEMS: Product[] = [
    {
        id: 'prod-1',
        name: 'Caffè Espresso',
        price: 1.10,
        category: 'Caffetteria',
        description: 'Caffè espresso classico',
        stock: 100,
        isFavorite: true,
        icon: '☕',
        costPrice: 0.20
    },
    {
        id: 'prod-2',
        name: 'Cappuccino',
        price: 1.50,
        category: 'Caffetteria',
        description: 'Cappuccino con latte fresco',
        stock: 50,
        isFavorite: true,
        icon: '🥛',
        costPrice: 0.35
    },
    {
        id: 'prod-3',
        name: 'Cornetto',
        price: 1.20,
        category: 'Pasticceria',
        description: 'Cornetto vuoto o farcito',
        stock: 80,
        isFavorite: false,
        icon: '🥐',
        costPrice: 0.40
    }
];

// Dati iniziali per il personale con emoji
export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
    { id: 'staff-1', name: 'Mario Rossi', shift: 'a', rcSubGroup: 1, icon: '👨‍🍳' },
    { id: 'staff-2', name: 'Laura Bianchi', shift: 'b', rcSubGroup: 1, icon: '👩‍💼' },
    { id: 'staff-3', name: 'Paolo Verdi', shift: 'c', rcSubGroup: 1, icon: '👨‍💻' },
    { id: 'staff-4', name: 'Anna Neri', shift: 'd', rcSubGroup: 1, icon: '👩‍🎨' },
];

// Configurazione Gradi VVF
export const VVF_GRADES = [
    { id: 'VIG', label: 'Vigile del Fuoco', short: 'VIG', type: 'chevron', count: 1 },
    { id: 'VE', label: 'Vigile Esperto', short: 'VE', type: 'chevron', count: 2 },
    { id: 'VESC', label: 'Vigile Esp. Scatto', short: 'VESC', type: 'chevron', count: 2 },
    { id: 'VC', label: 'Vigile Coord.', short: 'VC', type: 'chevron', count: 3 },
    { id: 'VCSC', label: 'Vigile Coord. Scatto', short: 'VCSC', type: 'chevron', count: 3 },
    { id: 'CS', label: 'Capo Squadra', short: 'CS', type: 'bar', count: 1 },
    { id: 'CQE', label: 'Capo Squadra Esp.', short: 'CQE', type: 'bar', count: 2 },
    { id: 'CR', label: 'Capo Reparto', short: 'CR', type: 'bar', count: 3 },
    { id: 'CRE', label: 'Capo Reparto Esp.', short: 'CRE', type: 'bar', count: 3 },
];

// Tipologie Intervento Standard
export const DEFAULT_INTERVENTION_TYPES = [
    "Intervento non più Necessario",
    "Allagamento",
    "Apertura Porta",
    "Ascensore Bloccato",
    "Bonifica Nido Insetti",
    "Caduta Pianta",
    "Crollo Tetto",
    "Danni D'Acqua",
    "Dissesto Statico",
    "Fuga Gas",
    "Gronda Pericolante",
    "Incendio Appartamento",
    "Incendio Autovettura",
    "Incendio Bosco",
    "Incendio Canna Fumaria",
    "Incendio Cantina",
    "Incendio Capanno Agricolo",
    "Incendio Cassonetto",
    "Incendio Generale",
    "Incendio Fabbrica",
    "Incendio Rotoballe",
    "Incendio Tetto",
    "Incendio Sterpaglie",
    "Monitoraggio Sostanze Pericolose",
    "Incidente Stradale",
    "Incidente Aeromobile",
    "Infiltrazioni Acqua",
    "Ingombro sede stradale",
    "Inquinamento acque superficiali o di falda",
    "Lavaggio sede stradale",
    "Muro Pericolante",
    "Palo Pericolante",
    "Pianta Pericolante",
    "Rami Pericolanti",
    "Recupero Beni",
    "Recupero Veicoli e Merci",
    "Recupero Salma",
    "Ricerca Persona",
    "Rimozione Ostacoli",
    "Salvataggio Animali",
    "Servizio Assistenza",
    "Soccorso a Persona",
    "Smottamento",
    "Tegole Pericolanti",
    "Verifica Allarme",
    "Verifica esalazioni monossido",
    "Verifica Incendio",
    "Verifica Stabilità"
];
