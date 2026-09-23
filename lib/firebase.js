// lib/firebase.js
// Firebase'ni ishga tushirish — Authentication, Firestore, Storage.
// Barcha maxfiy kalitlar environment variable'lardan o'qiladi (.env.local, .env.local.example'ga qarang).

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Next.js'da hot-reload paytida ilova qayta-qayta initsializatsiya qilinmasligi uchun tekshiruv
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Ba'zi tarmoqlar (zaif mobil signal, ba'zi provayderlar/proksi) Firestore'ning
// standart WebChannel ulanishini uzatib yubormaydi, natijada yozish/o'qish
// abadiy "kutish" holatida qoladi. experimentalAutoDetectLongPolling shu holatni
// avtomatik aniqlab, uzoq-so'rov (long polling) rejimiga o'tkazadi.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false,
  });
} catch (e) {
  // Next.js hot-reload paytida ikkinchi marta chaqirilsa xato beradi — bunday
  // holatda allaqachon yaratilgan instansiyani qaytaramiz.
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

export const storage = getStorage(app);

export default app;
