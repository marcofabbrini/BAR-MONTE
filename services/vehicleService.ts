
import { db } from '../firebaseConfig';
import { 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    QuerySnapshot,
    DocumentData
} from 'firebase/firestore';
import { Vehicle, VehicleBooking } from '../types';

export const VehicleService = {
    subscribeToVehicles: (onUpdate: (data: Vehicle[]) => void) => {
        return onSnapshot(collection(db, 'vehicles'), (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Vehicle)));
        });
    },

    subscribeToBookings: (onUpdate: (data: VehicleBooking[]) => void) => {
        // Order by start date descending (newest bookings first, though UI might invert)
        const q = query(collection(db, 'vehicle_bookings'), orderBy('startDate', 'asc'));
        return onSnapshot(q, (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as VehicleBooking)));
        });
    },

    addVehicle: async (vehicle: Omit<Vehicle, 'id'>) => {
        await addDoc(collection(db, 'vehicles'), vehicle);
    },

    updateVehicle: async (vehicle: Vehicle) => {
        const { id, ...data } = vehicle;
        await updateDoc(doc(db, 'vehicles', id), data);
    },

    deleteVehicle: async (id: string) => {
        await deleteDoc(doc(db, 'vehicles', id));
    },

    addBooking: async (booking: Omit<VehicleBooking, 'id' | 'timestamp'>) => {
        await addDoc(collection(db, 'vehicle_bookings'), {
            ...booking,
            timestamp: new Date().toISOString()
        });
    },

    deleteBooking: async (id: string) => {
        await deleteDoc(doc(db, 'vehicle_bookings', id));
    }
};
