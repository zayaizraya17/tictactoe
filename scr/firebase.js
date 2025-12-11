import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCVsHOX7Y3FlRMblFpPnEEe05cZ6hQvgOg",
  authDomain: "my-tic-tac-toe-app-12lcl.firebaseapp.com",
  projectId: "my-tic-tac-toe-app-12lcl",
  storageBucket: "my-tic-tac-toe-app-12lcl.firebasestorage.app",
  messagingSenderId: "202346681111",
  appId: "1:202346681111:web:1cceee35fd774d8e431d52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export const db = getFirestore(app);
