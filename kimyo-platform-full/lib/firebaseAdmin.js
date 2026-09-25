// lib/firebaseAdmin.js
// Server-side (FAQAT app/api/** route handler'larda) Firebase Admin SDK.
// Xizmat hisobi (service account) orqali cheklovlarsiz Auth/Firestore'ga
// kirish beradi — shuning uchun bu fayl hech qachon client komponentlardan
// ("use client") import qilinmasligi kerak.
//
// Nega umuman kerak: ustoz o'quvchi qo'shganda yoki uning parolini
// yangilaganda, oddiy client SDK (createUserWithEmailAndPassword /
// updatePassword) buni faqat "hozir tizimga kirgan foydalanuvchi" uchun
// bajara oladi — ya'ni ustozning o'z sessiyasini yangi o'quvchi bilan
// almashtirib qo'yardi yoki umuman boshqa odamning parolini yangilashga
// ruxsat bermasdi. Admin SDK esa buni ustoz sessiyasiga tegmasdan,
// serverda xavfsiz bajaradi.

import { cert, getApps, getApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function buildCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Netlify/Vercel kabi ko'p muhitlarda environment variable ichidagi "\n"
  // harfiy satr sifatida saqlanadi — shuning uchun uni haqiqiy qator
  // ko'chirishga almashtiramiz.
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin uchun FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL va " +
        "FIREBASE_ADMIN_PRIVATE_KEY environment o'zgaruvchilari to'ldirilmagan " +
        "(.env.local.example'ga qarang)."
    );
  }

  return cert({ projectId, clientEmail, privateKey });
}

const adminApp = getApps().length ? getApp() : initializeApp({ credential: buildCredential() });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
