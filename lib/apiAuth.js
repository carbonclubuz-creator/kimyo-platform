// lib/apiAuth.js
// app/api/teacher/** route handler'lari uchun umumiy yordamchi:
// so'rov header'idagi Firebase ID tokenni tekshiradi va chaqiruvchi
// haqiqatan ham "teacher" roliga ega ekanini Firestore'dan tasdiqlaydi.

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
