// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCH2dJRTpXpOPUhAERnAkcj_avqbEYCSXE",
  authDomain: "deliverymayorista-8c042.firebaseapp.com",
  projectId: "deliverymayorista-8c042",
  storageBucket: "deliverymayorista-8c042.firebasestorage.app",
  messagingSenderId: "98776210634",
  appId: "1:98776210634:web:5e89cecdb641988d53e833"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
