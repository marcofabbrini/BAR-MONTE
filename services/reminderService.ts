
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
        await addDoc(collection(db, 'reminders'), {
            ...reminder,
            completedDates: [],
            createdAt: new Date().toISOString()
        });
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
