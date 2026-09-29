// lib/bonusHelpers.js
// Server-only (Admin SDK). Admin yoqadigan "bonus jon"ni Firestore'dan
// (`sozlamalar/bonusJon` — bitta hujjat, faqat serverdan o'qiladi/yoziladi)
// o'qiydi. Faol/muddat mantig'i lib/bonusMantiq.js'da.

import { adminDb } from "./firebaseAdmin";
import { bonusniHisobla } from "./bonusMantiq";

export const BONUS_HUJJAT = "bonusJon";

/** Joriy bonus holati: { faol, soni, xabar, tugash }. Faol bo'lmasa soni = 0. */
export async function bonusniOl(now = new Date()) {
  const snap = await adminDb.collection("sozlamalar").doc(BONUS_HUJJAT).get();
  return bonusniHisobla(snap.exists ? snap.data() : undefined, now);
}
