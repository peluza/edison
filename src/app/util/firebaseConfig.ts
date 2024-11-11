// firebaseConfig.ts

import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Tu configuración de Firebase (solo incluye las claves necesarias para Firestore)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
// Inicializa Firebase
let app: FirebaseApp | null = null;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Error al inicializar Firebase:", error);
}

// Inicializa Firestore
let db: Firestore | null = null;
if (app) {
  try {
    db = getFirestore(app);
  } catch (error) {
    console.error("Error al inicializar Firestore:", error);
  }
}

// Exporta la instancia de Firestore
export { db };