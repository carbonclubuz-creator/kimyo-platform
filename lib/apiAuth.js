// lib/apiAuth.js
// app/api/teacher/** va app/api/admin/** route handler'lari uchun umumiy
// yordamchilar: Firebase ID tokenni (ustoz) yoki oddiy admin parolini
// (admin) tekshiradi.

import { adminAuth, adminDb } from "./firebaseAdmin";

/**
 * @param {Request} request
 * @returns {Promise<{ teacherUid: string, teacherData: object } | { error: string, status: number }>}
 */
export async function requireTeacher(request) {
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!idToken) {
    return { error: "Avtorizatsiya tokeni topilmadi", status: 401 };
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return { error: "Token yaroqsiz yoki muddati o'tgan", status: 401 };
  }

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userSnap.exists || userSnap.data().role !== "teacher") {
    return { error: "Faqat ustozlar uchun ruxsat etilgan", status: 403 };
  }

  return { teacherUid: decoded.uid, teacherData: userSnap.data() };
}

/**
 * Admin route'lari uchun oddiy parol tekshiruvi (0-QISM, 6-PROMPT:
 * "maxsus admin akkount ... yoki oddiy parol bilan himoyalangan"). Bu
 * to'liq Firebase Auth emas — bitta umumiy maxfiy parol, faqat serverda
 * (.env, ADMIN_SECRET_PASSWORD) saqlanadi va har so'rovda "x-admin-password"
 * header'i orqali tekshiriladi. MVP darajasidagi sodda himoya.
 *
 * @param {Request} request
 * @returns {{ ok: true } | { error: string, status: number }}
 */
export function requireAdmin(request) {
  const kutilgan = process.env.ADMIN_SECRET_PASSWORD || "";
  if (!kutilgan) {
    return { error: "Server tomonda ADMIN_SECRET_PASSWORD sozlanmagan", status: 500 };
  }

  const berilgan = request.headers.get("x-admin-password") || "";
  if (!berilgan || berilgan !== kutilgan) {
    return { error: "Parol noto'g'ri", status: 401 };
  }

  return { ok: true };
}
