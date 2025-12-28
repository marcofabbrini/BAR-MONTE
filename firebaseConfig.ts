
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { initializeFirestore, memoryLocalCache, memoryLruGarbageCollector } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVs7kbp_O6oMZ8AetE03S6Wu6cywL_ca0",
  authDomain: "bar-montepulciano-1f5a1.firebaseapp.com",
  projectId: "bar-montepulciano-1f5a1",
  storageBucket: "bar-montepulciano-1f5a1.firebasestorage.app",
  messagingSenderId: "99980065556",
  appId: "1:99980065556:web:1deb92a894006ac8532001",
  measurementId: "G-F5NHE0PFSK"
};

// Initialize Firebase (Compat)
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firestore (Modular)
// CRITICAL FIX: Use memoryLocalCache with LRU Garbage Collector.
// This prevents "Quota Exceeded" by not writing to disk (IndexedDB).
// Fixed: 'cacheSizeBytes' is the correct property name.
const db = initializeFirestore(app, {
  localCache: memoryLocalCache({
    garbageCollector: memoryLruGarbageCollector({
        cacheSizeBytes: 5 * 1024 * 1024 // Limit cache to 5MB
    })
  }),
  experimentalForceLongPolling: true 
});

// Initialize Auth (Compat)
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

export { db, auth, googleProvider };
