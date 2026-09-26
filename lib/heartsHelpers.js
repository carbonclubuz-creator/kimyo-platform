// lib/heartsHelpers.js
// Jonlar (hearts) tizimi uchun yordamchi funksiyalar (0-QISM, 7-band).
// Har kuni ertalab soat 7:00da (mahalliy vaqt) jonlar 5 taga qayta tiklanadi —
// shuning uchun "kunlik sana" oddiy kalendar kuni emas, 7:00dan boshlanadi:
// soat 00:00–06:59 oralig'i hali "kechagi" jon-kuni hisoblanadi.

export const KUNLIK_JON_SONI = 5;

/** Joriy "jon-kuni"ni YYYY-MM-DD ko'rinishida qaytaradi (7:00 chegara bilan). */
export function jonSanasi(now = new Date()) {
  const d = new Date(now);
  if (d.getHours() < 7) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** jonlar kolleksiyasidagi hujjat ID'si — har bir student+kun uchun bitta hujjat. */
export function jonHujjatId(studentId, sana) {
  return `${studentId}_${sana}`;
}
