// lib/hashteg.js
// FAQAT SERVER (app/api/**): sinf hashtegini (6 xonali raqam) yaratish va
// foydalanuvchi kiritgan qiymatni normallashtirish. Firebase Admin ishlatgani
// uchun "use client" komponentlardan import qilinmasin.

import { adminDb } from "./firebaseAdmin";

const HASHTEG_REGEX = /^\d{6}$/;

/** "#123 456" -> "123456"; yaroqsiz bo'lsa null. */
export function hashtegniTozala(xom) {
  const s = String(xom ?? "").replace(/[#\s]/g, "");
  return HASHTEG_REGEX.test(s) ? s : null;
}

/** Hozircha hech bir sinfda ishlatilmagan noyob 6 xonali hashteg qaytaradi. */
export async function yangiHashtegYarat() {
  for (let urinish = 0; urinish < 30; urinish += 1) {
    const kod = String(Math.floor(100000 + Math.random() * 900000));
    // eslint-disable-next-line no-await-in-loop
    const snap = await adminDb.collection("classes").where("hashteg", "==", kod).limit(1).get();
    if (snap.empty) return kod;
  }
  throw new Error("Noyob hashteg yaratib bo'lmadi");
}

/** Maxfiy so'zlarni solishtirish uchun: bo'shliq va registrga sezgir emas. */
export function maxfiySozniTenglashtir(xom) {
  return String(xom ?? "").trim().toLowerCase();
}
