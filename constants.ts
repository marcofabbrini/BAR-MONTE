
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
        icon: '☕'
    },
    {
        id: 'prod-2',
        name: 'Cappuccino',
        price: 1.50,
        category: 'Caffetteria',
        description: 'Cappuccino con latte fresco',
        stock: 50,
        isFavorite: true,
        icon: '🥛'
    },
    {
        id: 'prod-3',
        name: 'Cornetto',
        price: 1.20,
        category: 'Pasticceria',
        description: 'Cornetto vuoto o farcito',
        stock: 80,
        isFavorite: false,
        icon: '🥐'
    }
];

// Dati iniziali per il personale con emoji
export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
    { id: 'staff-1', name: 'Mario Rossi', shift: 'a', icon: '👨‍🍳' },
    { id: 'staff-2', name: 'Laura Bianchi', shift: 'b', icon: '👩‍💼' },
    { id: 'staff-3', name: 'Paolo Verdi', shift: 'c', icon: '👨‍💻' },
    { id: 'staff-4', name: 'Anna Neri', shift: 'd', icon: '👩‍🎨' },
];
