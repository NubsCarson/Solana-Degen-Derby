import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, onDisconnect } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB9NISAVaXOWlF2qLcq__Q0PQoaIWGfO8A",
  authDomain: "horse-race-tracker.firebaseapp.com",
  databaseURL: "https://horse-race-tracker-default-rtdb.firebaseio.com",
  projectId: "horse-race-tracker",
  storageBucket: "horse-race-tracker.firebasestorage.app",
  messagingSenderId: "333504999228",
  appId: "1:333504999228:web:b1b6adab7cee068cd53839",
  measurementId: "G-K5N1ZDE33C"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { 
  database, 
  storage, 
  ref, 
  storageRef,
  onValue, 
  set, 
  push, 
  onDisconnect,
  uploadBytes,
  getDownloadURL
}; 