// lib/testEngine.js
// app/api/student/test/** route'lari uchun umumiy yordamchilar. Bu fayl
// savollarni HECH QACHON to'g'ri javobi bilan birga clientga yubormaslik
// tamoyiliga xizmat qiladi — barcha aralashtirish/tekshirish shu yerda,
// serverda bajariladi.

import { adminDb } from "./firebaseAdmin";
import { KUNLIK_JON_SONI, jonHujjatId, jonSanasi } from "./heartsHelpers";

/** Fisher-Yates aralashtirish. */
export function aralashtir(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Joriy qolgan jonlar sonini o'qiydi (Admin SDK). */
export async function qolganJonniOl(studentId) {
  const sana = jonSanasi();
  const snap = await adminDb.collection("jonlar").doc(jonHujjatId(studentId, sana)).get();
  const ishlatilgan = snap.exists ? snap.data().ishlatilgan || 0 : 0;
  return Math.max(0, KUNLIK_JON_SONI - ishlatilgan);
}

/**
 * Urinish hujjatidagi savolTartibi + variantTartiblari asosida, clientga
 * yuborish uchun "xavfsiz" savollar ro'yxatini quradi — togriJavobIndex
 * HECH QACHON qo'shilmaydi, faqat matn va aralashtirilgan variant matnlari.
 */
export function xavfsizSavollarRoyxati(savolTartibi, variantTartiblari, savollarMap) {
  return savolTartibi.map((savolId) => {
    const savol = savollarMap[savolId];
    const tartib = variantTartiblari[savolId];
    return {
      savolId,
      matn: savol.matn,
      variantlar: tartib.map((aslIndeks) => savol.variantlar[aslIndeks]),
    };
  });
}
