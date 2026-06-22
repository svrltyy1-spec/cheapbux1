/* firebase.js — CheapBux Firebase initialisation
   Uses Firebase Web SDK v10 via CDN ES Modules
   GitHub Pages compatible — no build step required
------------------------------------------------ */
import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyBofjI3nDGlIuQmOs4ggXp8V1fkR8y0bEo',
  authDomain:        'cheapbux-8eecf.firebaseapp.com',
  projectId:         'cheapbux-8eecf',
  storageBucket:     'cheapbux-8eecf.firebasestorage.app',
  messagingSenderId: '544386377343',
  appId:             '1:544386377343:web:cb7102835fcb07f1f8814a',
  measurementId:     'G-GHK4LZX8ZY'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch };
