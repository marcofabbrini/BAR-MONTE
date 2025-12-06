import React, { useState, useEffect, useCallback } from 'react';
import { db, auth, googleProvider } from './firebaseConfig';
import { collection, onSnapshot, doc, getDocs, writeBatch, runTransaction, addDoc, updateDoc, deleteDoc, setDoc, orderBy, query, getDoc, where } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import AdminView from './components/AdminView';
import TombolaView from './components/TombolaView';
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order, TillColors, CashMovement, AdminUser, TombolaConfig, TombolaTicket, TombolaWin } from './types';

type View = 'selection' | 'till' | 'reports' | 'admin' | 'tombola';

// Helper per mescolare un array (Fisher-Yates shuffle)
const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const App: React.FC = () => {
    const [view, setView] = useState<View>('selection');
    const [selectedTillId, setSelectedTillId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminList, setAdminList] = useState<AdminUser[]>([]);

    const [products, setProducts] = useState<Product[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
    const [tillColors, setTillColors] = useState<TillColors>({});

    // Tombola State
    const [tombolaConfig, setTombolaConfig] = useState<TombolaConfig | undefined>(undefined);
    const [tombolaTickets, setTombolaTickets] = useState<TombolaTicket[]>([]);
    const [tombolaWins, setTombolaWins] = useState<TombolaWin[]>([]);

    // Calcolo Super Admin (il primo in lista è il Super Admin)
    const isSuperAdmin = currentUser && adminList.length > 0 && currentUser.email === adminList.sort((a,b) => a.timestamp.localeCompare(b.timestamp))[0].email;

    // Auth Listener & Admin Check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user && user.email) {
                const adminsRef = collection(db, 'admins');
                const adminsSnapshot = await getDocs(adminsRef);
                
                if (adminsSnapshot.empty) {
                    await addDoc(adminsRef, { email: user.email, addedBy: 'SYSTEM_BOOTSTRAP', timestamp: new Date().toISOString() });
                    setIsAdmin(true);
                } else {
                    const q = query(adminsRef, where("email", "==", user.email));
                    const querySnapshot = await getDocs(q);
                    setIsAdmin(!querySnapshot.empty);
                }
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Data Listeners
    useEffect(() => {
        setIsLoading(true);
        
        const unsubProducts = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({ ...d.data(), id: d.id } as Product))));
        const unsubStaff = onSnapshot(collection(db, 'staff'), (s) => setStaff(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember))));
        const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (s) => {
            setOrders(s.docs.map(d => ({ ...d.data(), id: d.id } as Order)));
            setIsLoading(false);
        });
        const unsubCash = onSnapshot(query(collection(db, 'cash_movements'), orderBy('timestamp', 'desc')), (s) => setCashMovements(s.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement))));
        const unsubAdmins = onSnapshot(collection(db, 'admins'), (s) => setAdminList(s.docs.map(d => ({ ...d.data(), id