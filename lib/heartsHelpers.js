// lib/heartsHelpers.js
// Jonlar (hearts) tizimi uchun yordamchi funksiyalar (0-QISM, 7-band).
// Har kuni ertalab soat 7:00da (Toshkent vaqti) jonlar 5 taga qayta tiklanadi —
// shuning uchun "kunlik sana" oddiy kalendar kuni emas, 7:00dan boshlanadi:
// soat 00:00–06:59 oralig'i hali "kechagi" jon-kuni hisoblanadi.

import { toshkentSanaSatri } from "./vaqt";

export const KUNLIK_JON_SONI = 5;
// Jonlar har kuni Toshkent vaqti bilan shu soatda tiklanadi.
export const JON_YANGILANISH_SOATI = 7;

/**
 * Joriy "jon-kuni"ni YYYY-MM-DD ko'rinishida qaytaradi (Toshkent vaqti bilan
 * 7:00 chegara). Jon-kuni 07:00 da almashgani uchun: hozirgi paytdan 7 soat
 * ayirib, Toshkent kalendar sanasini olish kifoya (01:30 -> oldingi kun,
 * 07:00 -> yangi kun). Server zonasiga bog'liq emas (lib/vaqt.js).
 */
export function jonSanasi(now = new Date()) {
  return toshkentSanaSatri(new Date(now.getTime() - JON_YANGILANISH_SOATI * 60 * 60 * 1000));
}

/** jonlar kolleksiyasidagi hujjat ID'si — har bir student+kun uchun bitta hujjat. */
export function jonHujjatId(studentId, sana) {
  return `${studentId}_${sana}`;
}
