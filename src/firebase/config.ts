import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAHmBCyGlSo1puz1LZ7k-4twg_XAcOqyRA",
  authDomain: "svgms-backend.firebaseapp.com",
  projectId: "svgms-backend",
  storageBucket: "svgms-backend.firebasestorage.app",
  messagingSenderId: "1065359559935",
  appId: "1:1065359559935:web:977cea73a68e05813750ca"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);