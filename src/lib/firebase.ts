import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAmRYZ7piUkqTdxPqlUL9WU7sM9jw5QBwg',
  authDomain: 'thinking-canvas.firebaseapp.com',
  projectId: 'thinking-canvas',
  storageBucket: 'thinking-canvas.firebasestorage.app',
  messagingSenderId: '123090202508',
  appId: '1:123090202508:web:4356079d6fe84af36870a9',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
