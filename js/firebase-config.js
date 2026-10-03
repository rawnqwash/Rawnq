// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCW-SoJ_6hNjEmdp8610mzVNRNiAEpzxA",
  authDomain: "rawnq-daec3.firebaseapp.com",
  projectId: "rawnq-daec3",
  storageBucket: "rawnq-daec3.firebasestorage.app",
  messagingSenderId: "117868599419",
  appId: "1:117868599419:web:3aef461012ce8cc43e2ade"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);