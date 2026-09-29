// lib/yangilikServer.js
// Server-only (Admin SDK). Yangiliklar uchun umumiy: hujjatni JSON'ga
// aylantirish, sahifalash kursori va bog'liq hujjatlarni tozalash.
//
// Kolleksiyalar (ikkalasi ham client uchun yopiq, faqat shu API'lar orqali):
//   yangiliklar/{id}: { matn, muallifId, muallifRoli: "admin"|"teacher",
//     yaratilgan, tahrirlangan (null yoki vaqt),
//     admin postida: ustozlarga: bool, mustaqilga: bool,
//     ustoz postida: classIds: [...] }
//   yangilikYuborishlar/{ustozId}_{yangilikId}: { ustozId, yangilikId,
//     classIds: [...], yuborilgan }   (adminning postini ustoz sinflariga yuborishi;
//     MATN NUSXALANMAYDI — o'quvchi asl hujjatni o'qiydi)

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

const BATCH_HAJMI = 400; // Firestore chegarasi 500 ta amal

export function millis(ts) {
  return ts && typeof ts.toMillis === "function" ? ts.toMillis() : null;
}

/** Firestore hujjatini API javobi uchun oddiy obyektga aylantiradi. */
export function yangilikJson(id, d) {
  const j = {
    id,
    matn: d.matn || "",
    muallifId: d.muallifId || "",
    muallifRoli: d.muallifRoli || "",
    yaratilgan: millis(d.yaratilgan),
    tahrirlangan: millis(d.tahrirlangan),
  };
  if (d.muallifRoli === "admin") {
    j.ustozlarga = d.ustozlarga === true;
    j.mustaqilga = d.mustaqilga === true;
  } else if (Array.isArray(d.classIds)) {
    j.classIds = d.classIds;
  }
  return j;
}

// ---- Sahifalash kursori: "sekund:nanosekund" (millisekundga yaxlitlash yo'q,
// shuning uchun bir millisekund ichidagi hujjatlar tushib qolmaydi). ----

export function kursorYasash(ts) {
  return `${ts.seconds}:${ts.nanoseconds}`;
}

/** Noto'g'ri kursor uchun null. */
export function kursorOqish(qiymat) {
  if (typeof qiymat !== "string") return null;
  const m = /^(\d{1,12}):(\d{1,9})$/.exec(qiymat);
  if (!m) return null;
  return new Timestamp(Number(m[1]), Number(m[2]));
}

async function refniOchir(refs) {
  for (let i = 0; i < refs.length; i += BATCH_HAJMI) {
    const batch = adminDb.batch();
    refs.slice(i, i + BATCH_HAJMI).forEach((r) => batch.delete(r));
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }
}

/** Shu admin postini ko'rsatuvchi barcha yuborishlarni o'chiradi (faqat havolalar o'qiladi). */
export async function yangilikYuborishlariniOchir(yangilikId) {
  const snap = await adminDb
    .collection("yangilikYuborishlar")
    .where("yangilikId", "==", yangilikId)
    .select()
    .get();
  await refniOchir(snap.docs.map((d) => d.ref));
}

/** Ustoz o'chirilganda uning postlari va yuborishlari ham o'chadi. */
export async function ustozYangiliklariniOchirRefs(ustozId) {
  const [postlar, yuborishlar] = await Promise.all([
    adminDb.collection("yangiliklar").where("muallifId", "==", ustozId).select().get(),
    adminDb.collection("yangilikYuborishlar").where("ustozId", "==", ustozId).select().get(),
  ]);
  return [...postlar.docs.map((d) => d.ref), ...yuborishlar.docs.map((d) => d.ref)];
}
