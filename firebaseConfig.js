// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBOPRTo7MoJf0Xx0TeigLt8mp5ZLeKQG7E",
  authDomain: "webdev-9a6e4.firebaseapp.com",
  projectId: "webdev-9a6e4",
  storageBucket: "webdev-9a6e4.firebasestorage.app",
  messagingSenderId: "346442282317",
  appId: "1:346442282317:web:f625caacbc9b112572b304",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
