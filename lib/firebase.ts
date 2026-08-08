import { getApp, getApps, initializeApp } from "firebase/app";
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

// Dev hot-reload re-evaluates this module, so reuse the app if it already exists.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
