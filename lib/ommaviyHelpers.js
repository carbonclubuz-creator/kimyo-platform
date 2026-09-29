// lib/ommaviyHelpers.js
// "Ko'plab qo'shish" (4-bosqich) uchun toza yordamchilar: matn maydonini
// qatorlarga ajratish, qator validatsiyasi (mavjud validateIsmFamiliya bilan —
// qoida qayta yozilmagan), takroriy ism-familiyalarni topish, bo'laklash.

import { validateIsmFamiliya } from "./accountHelpers";

export const JAMI_QATOR_MAX = 100; // client tomonda umumiy chegara
export const SOROV_BO_LAGI = 10; // server bir so'rovda ko'pi bilan shuncha qabul qiladi

/**
 * Matnni [{ ism, familiya }] ga ajratadi. Ajratuvchi: bo'sh joy yoki tab
 * (Excel'dan ikki ustun nusxalanganda tab keladi). \r\n, bo'sh qatorlar va
 * ortiqcha bo'shliqlar tozalanadi. 2 dan ko'p so'z bo'lsa: ism = birinchi
 * so'z, familiya = qolganlari (bo'sh joy bilan) — validatsiyada xato bo'ladi,
 * ustoz jadvalda tuzatadi. Bitta so'z bo'lsa familiya "" bo'ladi.
 */
export function matnniQatorlarga(matn) {
  return String(matn || "")
    .split(/\r\n|\r|\n/)
    .map((q) => q.split(/[\s\t]+/).filter(Boolean))
    .filter((sozlar) => sozlar.length > 0)
    .map((sozlar) => ({
      ism: sozlar[0],
      familiya: sozlar.slice(1).join(" "),
    }));
}

/** Bitta qator uchun { ismXato, familiyaXato, xato, ok } (mavjud validatsiya bilan). */
export function qatorniTekshir(q) {
  const ism = validateIsmFamiliya(q.ism);
  const fam = validateIsmFamiliya(q.familiya);
  return {
    ok: ism.valid && fam.valid,
    ismXato: ism.valid ? "" : ism.error,
    familiyaXato: fam.valid ? "" : fam.error,
    ismQiymat: ism.valid ? ism.value : null,
    familiyaQiymat: fam.valid ? fam.value : null,
  };
}

/** Yaroqli qatorlar orasida bir xil ism-familiya takrorlanganlarning (2-chi va keyingilari) indekslari. */
export function takroriyIndekslar(qatorlar) {
  const korilgan = new Set();
  const takror = new Set();
  qatorlar.forEach((q, i) => {
    const t = qatorniTekshir(q);
    if (!t.ok) return;
    const kalit = `${t.ismQiymat}|${t.familiyaQiymat}`.toLowerCase();
    if (korilgan.has(kalit)) takror.add(i);
    else korilgan.add(kalit);
  });
  return takror;
}

/** Massivni n tadan bo'laklarga bo'ladi. */
export function bolaklarga(arr, n) {
  const natija = [];
  for (let i = 0; i < arr.length; i += n) natija.push(arr.slice(i, i + n));
  return natija;
}

/** Nusxalash/ulashish matni: "Ism Familiya\nLogin: ...\nParol: ..." */
export function ulashishMatni({ ism, familiya, login, parol }) {
  return `${ism} ${familiya}\nLogin: ${login}\nParol: ${parol}`;
}
