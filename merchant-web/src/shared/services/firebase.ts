import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
  authDomain: "bluesystem-7c9af.firebaseapp.com",
  projectId: "bluesystem-7c9af",
  storageBucket: "bluesystem-7c9af.firebasestorage.app",
  messagingSenderId: "514416631826",
  appId: "1:514416631826:web:ceff16519cecd24088b8cb"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

