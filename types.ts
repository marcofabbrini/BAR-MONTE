
export interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    stock: number;
    isFavorite: boolean;
    icon?: string;
    costPrice?: number; // Prezzo di acquisto per calcolo margini
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
    isDeleted?: boolean; // Soft delete
    deletedBy?: string;
    deletedAt?: string;
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

export interface TillColors {
    [key: string]: string; 
}

export interface CashMovement {
    id: string;
    amount: number;
    reason: string;
    timestamp: string;
    type: 'withdrawal' | 'deposit';
}

export interface AdminUser {
    id: string;
    email: string;
    addedBy: string;
    timestamp: string;
}