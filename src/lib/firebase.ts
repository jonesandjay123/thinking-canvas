import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY

if (!firebaseApiKey) {
  throw new Error('Missing VITE_FIREBASE_API_KEY. Add it to your .env.local before starting the app.')
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: 'thinking-canvas.firebaseapp.com',
  projectId: 'thinking-canvas',
  storageBucket: 'thinking-canvas.firebasestorage.app',
  messagingSenderId: '123090202508',
  appId: '1:123090202508:web:4356079d6fe84af36870a9',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
