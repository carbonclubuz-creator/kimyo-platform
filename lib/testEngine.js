// lib/testEngine.js
// app/api/student/test/** route'lari uchun umumiy yordamchilar. Bu fayl
// savollarni HECH QACHON to'g'ri javobi bilan birga clientga yubormaslik
// tamoyiliga xizmat qiladi — barcha aralashtirish/tekshirish shu yerda,
// serverda bajariladi.

import { adminDb } from "./firebaseAdmin";
import { KUNLIK_JON_SONI, jonHujjatId, jonSanasi } from "./heartsHelpers";
import { bonusniOl } from "./bonusHelpers";

/** Fisher-Yates aralashtirish. */
export function aralashtir(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Jon holati: qolgan jon, jami jon (5 + bonus) va bonus haqida ma'lumot.
 * qolgan = max(0, KUNLIK_JON_SONI + bonus - ishlatilgan). Bonus yoqilganda
 * allaqachon 5 jonini ishlatgan o'quvchi darhol bonus jonlarni oladi;
 * bonus o'chsa/muddati tugasa ishlatilgan son buzilmaydi (faqat jami kamayadi).
 */
export async function jonHolatiniOl(studentId) {
  const sana = jonSanasi();
  const [snap, bonus] = await Promise.all([
    adminDb.collection("jonlar").doc(jonHujjatId(studentId, sana)).get(),
    bonusniOl(),
  ]);
  const ishlatilgan = snap.exists ? snap.data().ishlatilgan || 0 : 0;
  const jamiJon = KUNLIK_JON_SONI + bonus.soni;
  return {
    qolganJon: Math.max(0, jamiJon - ishlatilgan),
    jamiJon,
    bonus: { faol: bonus.faol, soni: bonus.soni, xabar: bonus.xabar },
  };
}

/** Joriy qolgan jonlar sonini o'qiydi (Admin SDK) — bonus hisobga olinadi. */
export async function qolganJonniOl(studentId) {
  return (await jonHolatiniOl(studentId)).qolganJon;
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
