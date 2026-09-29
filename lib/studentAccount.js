// lib/studentAccount.js
// Server-only (Admin SDK). Ustoz tomonidan o'quvchi akkountini yaratishning
// UMUMIY mantig'i: unikal login yasash, `adminAuth.createUser`, `users` hujjati.
// Yakka va ommaviy (bulk) route'lar bir xil funksiyadan foydalanadi.
//
// POYGA HOLATIDAN HIMOYA: login avval `loginlar/{loginLower}` hujjati orqali
// Firestore TRANSAKSIYASI bilan "band qilinadi", va faqat shundan keyin
// Firebase Auth'da akkount yaratiladi. Parallel chaqiruvlar (bulk'da 5 ta)
// bir xil loginni band qila olmaydi — Firestore atomikligini kafolatlaydi.

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin";
import { generatePassword, loginToAuthEmail } from "./accountHelpers";

const MAX_URINISH = 25;

/**
 * Loginni atomik band qiladi.
 * @returns {Promise<boolean>} true — band qilindi; false — allaqachon band edi.
 */
async function loginniBandQil(loginLower) {
  const ref = adminDb.collection("loginlar").doc(loginLower);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.set(ref, { uid: null, band: true, vaqt: FieldValue.serverTimestamp() });
    return true;
  });
}

/**
 * @param {{ ismCap: string, familiyaCap: string, classId: string, teacherData: object }} p
 *   ismCap/familiyaCap — validateIsmFamiliya().value (allaqachon tekshirilgan).
 * @returns {Promise<{ uid: string, login: string, password: string }>}
 * @throws {Error} `.kod` = "akkount" (Auth xatosi) yoki "login" (unikal login topilmadi)
 */
export async function createStudentAccount({ ismCap, familiyaCap, classId, teacherData }) {
  const password = generatePassword();
  const base = `${ismCap}${familiyaCap}`;

  let login = base;
  let userRecord = null;

  const keyingiLogin = () => {
    const suffix = String(Math.floor(Math.random() * 100)).padStart(2, "0");
    login = `${base}${suffix}`;
  };

  for (let attempt = 0; attempt <= MAX_URINISH; attempt += 1) {
    // 1) Avval loginni transaksiya bilan band qilamiz.
    // eslint-disable-next-line no-await-in-loop
    const band = await loginniBandQil(login.toLowerCase());
    if (!band) {
      keyingiLogin();
      continue;
    }

    // 2) Band qilingandan keyingina Auth akkount yaratiladi.
    const email = loginToAuthEmail(login);
    try {
      // eslint-disable-next-line no-await-in-loop
      userRecord = await adminAuth.createUser({ email, password });
      break;
    } catch (err) {
      if (err && err.code === "auth/email-already-exists") {
        // Masalan `loginlar` kolleksiyasi paydo bo'lishidan oldin yaratilgan
        // eski akkountlar. Band qilingan hujjat "kuygan" bo'lib qolaveradi.
        keyingiLogin();
      } else {
        const e = new Error("Akkount yaratishda xatolik yuz berdi");
        e.kod = "akkount";
        throw e;
      }
    }
  }

  if (!userRecord) {
    const e = new Error("Unikal login yaratib bo'lmadi, qayta urinib ko'ring");
    e.kod = "login";
    throw e;
  }

  await adminDb
    .collection("users")
    .doc(userRecord.uid)
    .set({
      uid: userRecord.uid,
      role: "student",
      ism: ismCap,
      familiya: familiyaCap,
      login,
      loginLower: login.toLowerCase(),
      viloyat: teacherData.viloyat || "",
      tuman: teacherData.tuman || "",
      classId,
      // Qanday qo'shilgani: "ustoz" — parolini ustoz istalgan payt yangilay
      // oladi; "hashteg" — faqat o'quvchining o'zi so'rov yuborganda.
      qoshilishUsuli: "ustoz",
      // Ustoz jadvalda istalgan payt ko'ra olishi uchun saqlanadi (ko'z
      // ikonkasi bilan yashirin/ko'rsatilgan).
      currentPassword: password,
      umumiyBali: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

  // Band qilingan login hujjatiga egasini yozib qo'yamiz (tranzaksiya shart emas).
  await adminDb
    .collection("loginlar")
    .doc(login.toLowerCase())
    .set({ uid: userRecord.uid }, { merge: true });

  return { uid: userRecord.uid, login, password };
}
