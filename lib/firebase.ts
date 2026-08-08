import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values identify the Firebase project to the client; they are not
// secrets and are meant to ship in browser code. Firestore rules and Auth
// settings are what actually protect the project.
const firebaseConfig = {
  apiKey: "AIzaSyChjQ30a0gmYB9xL_qU5PwXnuOZ_bNsP3M",
  authDomain: "pocket-heist-website-4a91c.firebaseapp.com",
  projectId: "pocket-heist-website-4a91c",
  storageBucket: "pocket-heist-website-4a91c.firebasestorage.app",
  messagingSenderId: "394548719849",
  appId: "1:394548719849:web:c2fc882ba140dff28f0078",
};

// Safe to call on every module evaluation: initializeApp returns the existing
// app when the options deep-equal an already-initialized one.
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
