import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, onDisconnect } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDZOxEFxXvxBVOPTp4RaQzqWEVJnU-YVQM",
  authDomain: "solana-degen-derby.firebaseapp.com",
  projectId: "solana-degen-derby",
  storageBucket: "solana-degen-derby.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef1234567890",
  databaseURL: "https://solana-degen-derby-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

export { 
  database, 
  storage,
  ref,
  storageRef,
  onValue, 
  push, 
  set,
  uploadBytes,
  getDownloadURL,
  onDisconnect
}; 