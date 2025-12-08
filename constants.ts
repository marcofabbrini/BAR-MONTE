
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