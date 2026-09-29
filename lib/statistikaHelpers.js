// lib/statistikaHelpers.js
// Ustoz statistikasi (3-bosqich) uchun TOZA hisoblash funksiyalari — route'lar
// ingichka bo'lishi va logika alohida tekshirilishi uchun shu yerga chiqarilgan.
//
// Ball/foiz hisobi qayta yozilmagan: davr tablari uchun `davrBoyichaBalllar()`,
// "Mavzular" tabi uchun `mavzuBoyichaEngYuqoriFoizlar()` (lib/reytingHelpers.js)
// — ya'ni reyting bilan AYNAN bir xil qoida (har mavzudan faqat eng yuqori
// natija). Bu fayl faqat ustiga "tahliliy" ma'lumotni qo'shadi: urinishlar
// soni, tugallangan/tugallanmagan, oxirgi faollik vaqti, urinishlar tarixi.
// Bu ma'lumotlar FAQAT ustozga ko'rinadi (/api/teacher/**), o'quvchi
// route'lariga hech qachon chiqmaydi.

import {
  davrBoyichaBalllar,
  davrOraligi,
  mavzuBoyichaEngYuqoriFoizlar,
  urinishVaqti,
} from "./reytingHelpers";

export const RUXSAT_ETILGAN_DAVRLAR = ["bugungi", "kechagi", "haftalik", "umumiy", "mavzu"];

/** Noma'lum davr kelsa "haftalik" (default) qaytaradi. */
export function davrniTozala(davrParam) {
  return RUXSAT_ETILGAN_DAVRLAR.includes(davrParam) ? davrParam : "haftalik";
}

/** Firestore Timestamp (yoki Date) -> ISO satr; bo'lmasa null. */
export function vaqtISO(ts) {
  if (!ts) return null;
  const d = typeof ts.toDate === "function" ? ts.toDate() : ts instanceof Date ? ts : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

/**
 * Bitta urinish tanlangan davr/mavzu filtriga kiradimi?
 *  - davr tablari: urinishVaqti() (tugallangan -> tugallanganVaqt,
 *    tugallanmagan -> boshlanganVaqt) tanlangan oraliqda bo'lsa;
 *  - "mavzu": faqat shu mavzuId (butun vaqt);
 *  - "umumiy": hammasi.
 */
export function urinishFiltri(davr, mavzuId, now = new Date()) {
  if (davr === "mavzu") {
    return (u) => Boolean(mavzuId) && u.mavzuId === mavzuId;
  }
  const oraliq = davrOraligi(davr, now);
  if (!oraliq.boshlanish && !oraliq.tugash) return () => true;
  return (u) => {
    const vaqt = urinishVaqti(u);
    if (!vaqt) return false; // vaqti noma'lum urinish cheklangan davrga kirmaydi
    if (oraliq.boshlanish && vaqt < oraliq.boshlanish) return false;
    if (oraliq.tugash && vaqt >= oraliq.tugash) return false;
    return true;
  };
}

function ismFamiliyaTartibi(a, b) {
  return `${a.ism} ${a.familiya}`.localeCompare(`${b.ism} ${b.familiya}`, "uz");
}

/**
 * Sinf ro'yxati statistikasi. Test ishlamagan o'quvchi HECH QACHON
 * chiqarib tashlanmaydi — 0 ball bilan pastda turadi.
 *
 * @param {object} p
 * @param {Array<{id: string, ism: string, familiya: string}>} p.oquvchilar
 * @param {Array<object>} p.urinishlar  urinishlar hujjatlari (data()), studentId bilan
 * @param {string} p.davr
 * @param {string} [p.mavzuId]
 * @param {Date} [p.now]
 * @returns {{ royxat: Array<object>, birlik: "ball" | "%" }}
 */
export function sinfStatistikasi({ oquvchilar, urinishlar, davr, mavzuId = "", now = new Date() }) {
  const filtr = urinishFiltri(davr, mavzuId, now);
  const tanlangan = urinishlar.filter(filtr);

  // Ball/foiz — reytingdagi bilan bir xil funksiyalar.
  let ballarMap;
  let birlik = "ball";
  if (davr === "mavzu") {
    birlik = "%";
    ballarMap = mavzuId ? mavzuBoyichaEngYuqoriFoizlar(urinishlar, mavzuId) : new Map();
  } else {
    ballarMap = davrBoyichaBalllar(urinishlar, davrOraligi(davr, now));
  }

  // O'quvchi bo'yicha tahliliy sonlar (faqat tanlangan davr/mavzu ichida).
  const tahlil = new Map();
  for (const u of tanlangan) {
    if (!tahlil.has(u.studentId)) {
      tahlil.set(u.studentId, { urinishlarSoni: 0, tugallanganSoni: 0, tugallanmaganSoni: 0, oxirgi: null });
    }
    const t = tahlil.get(u.studentId);
    t.urinishlarSoni += 1;
    if (u.holati === "tugallangan") t.tugallanganSoni += 1;
    else t.tugallanmaganSoni += 1;
    const vaqt = urinishVaqti(u);
    if (vaqt && (!t.oxirgi || vaqt > t.oxirgi)) t.oxirgi = vaqt;
  }

  const royxat = oquvchilar.map((o) => {
    const t = tahlil.get(o.id);
    return {
      studentId: o.id,
      ism: o.ism || "",
      familiya: o.familiya || "",
      ball: ballarMap.get(o.id) || 0,
      urinishlarSoni: t ? t.urinishlarSoni : 0,
      tugallanganSoni: t ? t.tugallanganSoni : 0,
      tugallanmaganSoni: t ? t.tugallanmaganSoni : 0,
      oxirgiFaoliyat: t && t.oxirgi ? t.oxirgi.toISOString() : null,
    };
  });

  // Ball kamayishi bo'yicha; teng bo'lsa ism-familiya alifbo bo'yicha.
  royxat.sort((a, b) => b.ball - a.ball || ismFamiliyaTartibi(a, b));
  royxat.forEach((r, i) => {
    r.pozitsiya = i + 1;
  });

  return { royxat, birlik };
}

/**
 * Bitta o'quvchining urinishlar tarixi + xulosasi (davr/mavzu filtri bilan).
 *
 * @param {object} p
 * @param {string} p.studentId
 * @param {Array<object & {id: string}>} p.urinishlar  shu o'quvchining urinishlari (id bilan)
 * @param {Record<string, string>} p.mavzuNomlari  mavzuId -> nomi
 * @returns {{ xulosa: object, urinishlar: Array<object> }}
 */
export function oquvchiTarixi({ studentId, urinishlar, mavzuNomlari, davr, mavzuId = "", now = new Date() }) {
  const filtr = urinishFiltri(davr, mavzuId, now);
  const tanlangan = urinishlar.filter(filtr);

  const tarix = tanlangan.map((u) => {
    const tugallangan = u.holati === "tugallangan";
    const boshlangan = vaqtISO(u.boshlanganVaqt);
    const tugagan = tugallangan ? vaqtISO(u.tugallanganVaqt) : null;
    const jamiSavol = u.jamiSavol || 0;
    const javobBerilgan = Array.isArray(u.javoblar) ? u.javoblar.length : 0;

    let davomiylikSoniya = null;
    if (boshlangan && tugagan) {
      const farq = (new Date(tugagan).getTime() - new Date(boshlangan).getTime()) / 1000;
      davomiylikSoniya = farq >= 0 ? Math.round(farq) : null;
    }

    return {
      id: u.id,
      mavzuId: u.mavzuId,
      mavzuNomi: mavzuNomlari[u.mavzuId] || "O'chirilgan mavzu",
      boshlangan,
      tugallangan: tugagan,
      davomiylikSoniya,
      holati: tugallangan ? "tugallangan" : "tugallanmagan",
      togriSoni: u.togriSoni || 0,
      jamiSavol,
      javobBerilgan,
      // Foiz faqat tugallangan urinish uchun mazmunli.
      foiz: tugallangan && jamiSavol ? Math.round(((u.togriSoni || 0) / jamiSavol) * 100) : null,
    };
  });

  // Yangisi birinchi (boshlangan vaqt bo'yicha).
  tarix.sort((a, b) => (b.boshlangan || "").localeCompare(a.boshlangan || ""));

  const tugallanganSoni = tarix.filter((t) => t.holati === "tugallangan").length;
  const xulosa = {
    urinishlarSoni: tarix.length,
    tugallanganSoni,
    tugallanmaganSoni: tarix.length - tugallanganSoni,
  };
  if (davr === "mavzu") {
    const foiz = mavzuId
      ? mavzuBoyichaEngYuqoriFoizlar(
          urinishlar.map((u) => ({ ...u, studentId })),
          mavzuId
        ).get(studentId)
      : undefined;
    xulosa.engYuqoriFoiz = foiz === undefined ? null : foiz;
  }

  return { xulosa, urinishlar: tarix };
}

/** Massivni `n` tadan bo'laklarga bo'ladi (Firestore `in` limiti uchun — 30). */
export function bolaklarga(arr, n) {
  const natija = [];
  for (let i = 0; i < arr.length; i += n) natija.push(arr.slice(i, i + n));
  return natija;
}
