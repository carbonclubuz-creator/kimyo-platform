// lib/reytingHelpers.js
// Reyting va "umumiy ball" hisob-kitoblari uchun umumiy yordamchilar
// (0-QISM 6.4/6.5-band). Asosiy qoida: bitta mavzudan reytingga FAQAT eng
// yuqori (max) natija qo'shiladi — necha marta qayta ishlangandan qat'i
// nazar (shu tufayli "grinding" bilan reytingni sun'iy oshirib bo'lmaydi).
// Davr bo'yicha (Bugungi/Kechagi/Haftalik) shu qoida faqat shu davr ichidagi
// urinishlarga nisbatan qo'llanadi.

import { KUN_MS, toshkentKunBoshi } from "./vaqt";

/**
 * Berilgan davr nomiga mos [boshlanish, tugash) oralig'ini (Date) qaytaradi.
 * "umumiy" uchun ikkalasi ham null (cheklovsiz). Diqqat: bu oddiy kalendar
 * kuni chegarasi (Toshkent vaqti bilan 00:00) — jon (hearts) tizimidagi 7:00
 * chegarasidan farqli (heartsHelpers.js), chunki reyting va jon — ikki
 * mustaqil tizim. Chegaralar server zonasiga bog'liq EMAS (lib/vaqt.js).
 */
export function davrOraligi(davr, now = new Date()) {
  const bugun = toshkentKunBoshi(now);

  if (davr === "bugungi") {
    const tugash = new Date(bugun.getTime() + KUN_MS);
    return { boshlanish: bugun, tugash };
  }
  if (davr === "kechagi") {
    const boshlanish = new Date(bugun.getTime() - KUN_MS);
    return { boshlanish, tugash: bugun };
  }
  if (davr === "haftalik") {
    // Kalendar haftasi emas — oxirgi 7 kun = 7×24 soat (0-QISM 5.5-band).
    const boshlanish = new Date(now.getTime() - 7 * KUN_MS);
    return { boshlanish, tugash: null };
  }
  return { boshlanish: null, tugash: null }; // "umumiy"
}

/**
 * Firestore urinish hujjatidan "tugallangan vaqt"ni oladi. Yangi
 * hujjatlarda tugallanganVaqt bor; shu maydon qo'shilishidan oldin
 * yaratilgan eski hujjatlarda boshlanganVaqt bilan taxminiy hisoblanadi.
 */
export function urinishVaqti(urinish) {
  const ts = urinish.tugallanganVaqt || urinish.boshlanganVaqt;
  return ts && typeof ts.toDate === "function" ? ts.toDate() : null;
}

function oraliqdami(vaqt, oraliq) {
  if (!oraliq.boshlanish && !oraliq.tugash) return true; // "umumiy" — cheklovsiz
  if (!vaqt) return false; // vaqti noma'lum urinish, cheklangan davrga kirmaydi
  if (oraliq.boshlanish && vaqt < oraliq.boshlanish) return false;
  if (oraliq.tugash && vaqt >= oraliq.tugash) return false;
  return true;
}

/**
 * Bir nechta o'quvchining "tugallangan" urinishlaridan, berilgan davr
 * ichida, har mavzu bo'yicha ENG YUQORI to'g'ri javoblar sonini topib,
 * ularni qo'shib har o'quvchi uchun "umumiy ball"ni hisoblaydi.
 *
 * @param {Array<object>} urinishlar - {studentId, mavzuId, togriSoni, holati, ...}
 * @param {{boshlanish: Date|null, tugash: Date|null}} oraliq
 * @returns {Map<string, number>} studentId -> ball
 */
export function davrBoyichaBalllar(urinishlar, oraliq) {
  const eng = new Map(); // studentId -> Map(mavzuId -> bestTogriSoni)
  for (const u of urinishlar) {
    if (u.holati !== "tugallangan") continue;
    const vaqt = urinishVaqti(u);
    if (!oraliqdami(vaqt, oraliq)) continue;

    if (!eng.has(u.studentId)) eng.set(u.studentId, new Map());
    const mavzular = eng.get(u.studentId);
    const oldBest = mavzular.get(u.mavzuId) || 0;
    if (u.togriSoni > oldBest) mavzular.set(u.mavzuId, u.togriSoni);
  }

  const ballar = new Map();
  for (const [studentId, mavzular] of eng) {
    let yigindi = 0;
    for (const b of mavzular.values()) yigindi += b;
    ballar.set(studentId, yigindi);
  }
  return ballar;
}

/**
 * Bitta mavzu bo'yicha, BUTUN VAQT davomidagi ENG YUQORI foizlarni
 * hisoblaydi (0-QISM 5.5/6.5-band "Mavzular" bo'limi uchun).
 *
 * @returns {Map<string, number>} studentId -> foiz (0-100)
 */
export function mavzuBoyichaEngYuqoriFoizlar(urinishlar, mavzuId) {
  const eng = new Map();
  for (const u of urinishlar) {
    if (u.holati !== "tugallangan" || u.mavzuId !== mavzuId || !u.jamiSavol) continue;
    const foiz = Math.round((u.togriSoni / u.jamiSavol) * 100);
    if (!eng.has(u.studentId) || foiz > eng.get(u.studentId)) {
      eng.set(u.studentId, foiz);
    }
  }
  return eng;
}
