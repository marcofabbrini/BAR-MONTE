
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { getFirestore } from "firebase/firestore";

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

// Initialize Firestore (Modular - compatible with compat app instance)
const db = getFirestore(app);

// Initialize Auth (Compat)
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

export { db, auth, googleProvider };
