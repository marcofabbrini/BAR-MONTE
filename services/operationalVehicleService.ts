
import { db } from '../firebaseConfig';
import { 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    QuerySnapshot,
    DocumentData
} from 'firebase/firestore';
import { OperationalVehicle } from '../types';

export const OperationalVehicleService = {
    subscribeToVehicles: (onUpdate: (data: OperationalVehicle[]) => void) => {
        return onSnapshot(collection(db, 'operational_vehicles'), (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as OperationalVehicle)));
        });
    },

    addVehicle: async (vehicle: Omit<OperationalVehicle, 'id'>) => {
        await addDoc(collection(db, 'operational_vehicles'), vehicle);
    },

    updateVehicle: async (vehicle: OperationalVehicle) => {
        const { id, ...data } = vehicle;
        await updateDoc(doc(db, 'operational_vehicles', id), data);
    },

    deleteVehicle: async (id: string) => {
        await deleteDoc(doc(db, 'operational_vehicles', id));
    }
};
