import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Cole aqui as credenciais que você copiou do Firebase!
const firebaseConfig = {
  apiKey: "AIzaSyALjJftSqoWMJnzaLpdgGDCjtuy4TsFxWw",
  authDomain: "inner-voice-method.firebaseapp.com",
  projectId: "inner-voice-method",
  storageBucket: "inner-voice-method.firebasestorage.app",
  messagingSenderId: "729622544412",
  appId: "1:729622544412:web:4fcacbc8dce22085df1fd9"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore
export const db = getFirestore(app);

export default app;
