// lib/sinfEgaligi.js
// Server-only (Admin SDK). Sinf haqiqatan ham shu ustozga tegishlimi va
// o'quvchi aynan shu sinfdami — izolyatsiya tekshiruvlari (3-4-bosqich
// route'lari) uchun umumiy yordamchilar. Tekshiruv o'tmasa chaqiruvchi 404
// qaytaradi: boshqa ustozning sinfi/o'quvchisi haqida hech narsa oshkor bo'lmaydi.

import { adminDb } from "./firebaseAdmin";

/** Sinf shu ustozniki bo'lsa { id, ...data }, aks holda null. */
export async function ustozSinfi(classId, teacherUid) {
  if (!classId || typeof classId !== "string") return null;
  const snap = await adminDb.collection("classes").doc(classId).get();
  if (!snap.exists || snap.data().teacherId !== teacherUid) return null;
  return { id: snap.id, ...snap.data() };
}

/** Sinf ustozniki VA o'quvchi shu sinfda bo'lsa { sinf, oquvchi }, aks holda null. */
export async function ustozOquvchisi(classId, studentId, teacherUid) {
  if (!studentId || typeof studentId !== "string") return null;
  const sinf = await ustozSinfi(classId, teacherUid);
  if (!sinf) return null;
  const snap = await adminDb.collection("users").doc(studentId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data.role !== "student" || data.classId !== classId) return null;
  return { sinf, oquvchi: { id: snap.id, ...data } };
}
