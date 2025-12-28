
import { db } from '../firebaseConfig';
import { 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    updateDoc, 
    QuerySnapshot,
    DocumentData,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { Reminder } from '../types';

export const ReminderService = {
    subscribeToReminders: (onUpdate: (data: Reminder[]) => void) => {
        return onSnapshot(collection(db, 'reminders'), (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Reminder)));
        });
    },

    addReminder: async (reminder: Omit<Reminder, 'id' | 'createdAt' | 'completedDates'>) => {
        // Remove undefined fields to prevent Firestore errors
        const cleanReminder = Object.fromEntries(
            Object.entries(reminder).filter(([_, v]) => v !== undefined)
        );

        await addDoc(collection(db, 'reminders'), {
            ...cleanReminder,
            completedDates: [],
            createdAt: new Date().toISOString()
        });
    },

    updateReminder: async (id: string, reminder: Partial<Reminder>) => {
        const cleanReminder = Object.fromEntries(
            Object.entries(reminder).filter(([_, v]) => v !== undefined)
        );
        await updateDoc(doc(db, 'reminders', id), cleanReminder);
    },

    deleteReminder: async (id: string) => {
        await deleteDoc(doc(db, 'reminders', id));
    },

    toggleCompletion: async (id: string, date: string, currentCompletedDates: string[]) => {
        const isCompleted = currentCompletedDates.includes(date);
        const ref = doc(db, 'reminders', id);
        
        if (isCompleted) {
            await updateDoc(ref, {
                completedDates: arrayRemove(date)
            });
        } else {
            await updateDoc(ref, {
                completedDates: arrayUnion(date)
            });
        }
    }
};
