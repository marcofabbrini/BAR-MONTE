
export interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    stock: number;
    isFavorite: boolean;
    icon?: string;
}

export interface OrderItem {
    product: Product;
    quantity: number;
}

export interface Order {
    id: string;
    items: OrderItem[];
    total: number;
    timestamp: string;
    staffId?: string;
    staffName?: string;
    tillId: string;
}

export interface Till {
    id: string;
    name: string;
    shift: Shift;
}

export type Shift = 'a' | 'b' | 'c' | 'd';

export interface StaffMember {
    id: string;
    name: string;
    shift: Shift;
    icon?: string;
}

// Nuova interfaccia per i colori delle casse
export interface TillColors {
    [key: string]: string; // es. 'TA': '#ff0000'
}
