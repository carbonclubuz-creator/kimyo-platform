// lib/yangilikHelpers.js
// Yangiliklar (3-BOSQICH) uchun umumiy, sof yordamchilar. Bu fayl client va
// server ikkalasida ishlatiladi (server-only import YO'Q) — Admin SDK'ga
// bog'liq qismlar lib/yangilikServer.js da.

import { toshkentSanaKorinish, toshkentSoatDaqiqa } from "./vaqt";

export const YANGILIK_MAX_UZUNLIK = 4000;
/** Bir sahifada yuklanadigan yangiliklar soni ("Yana yuklash" bilan davom etadi). */
export const YANGILIK_SAHIFA_HAJMI = 20;

/**
 * Yangilik matnini tekshiradi va tozalaydi. HTML QO'LLAB-QUVVATLANMAYDI: matn
 * har doim oddiy matn sifatida (React escape qiladi) ko'rsatiladi, shuning
 * uchun teglar o'chirilmaydi — ular shunchaki harflar bo'lib ko'rinadi.
 * Qator uzilishlari saqlanadi (\r\n -> \n); ko'rinmas boshqaruv belgilari
 * (\n va \t dan boshqa) olib tashlanadi.
 *
 * @param {unknown} xom
 * @returns {{ matn: string } | { error: string }}
 */
export function yangilikMatniniTekshir(xom) {
  if (typeof xom !== "string") return { error: "Yangilik matnini yozing" };
  const matn = xom
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (!matn) return { error: "Yangilik matnini yozing" };
  if (matn.length > YANGILIK_MAX_UZUNLIK) {
    return { error: `Matn ${YANGILIK_MAX_UZUNLIK} belgidan oshmasligi kerak` };
  }
  return { matn };
}

/** Telegramdagidek belgi: "tahrirlangan 30.09.2026 14:35" (Toshkent vaqti). Tahrirlanmagan bo'lsa "". */
export function tahrirlanganBelgisi(millis) {
  if (!millis) return "";
  return `tahrirlangan ${toshkentSanaKorinish(millis)} ${toshkentSoatDaqiqa(millis)}`;
}
