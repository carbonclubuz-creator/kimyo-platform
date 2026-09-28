// lib/faylTestHelpers.js
// Admin panelidagi "Fayl orqali test qo'shish" bo'limi uchun umumiy
// yordamchilar: Excel qatorlarini tekshirish va savollar massiviga
// aylantirish. Bu fayl "use client" komponentida ham ishlatilgani uchun
// faqat oddiy JS — hech qanday server-only (firebase-admin) import yo'q.
//
// Format: A-ustun — savol matni, B-ustun — to'g'ri javob, C/D/E-ustun —
// 3 ta xato javob (jami 4 ta kalit — testEngine.js o'zgarishsiz
// ishlayveradi). 1-qator sarlavha deb hisoblanadi va o'tkazib yuboriladi.
//
// Ruxsat etilgan belgilar: harflar (har qanday til), raqamlar (oddiy va
// daraja/index Unicode shakllari — H₂O, SO₄²⁻ kabi \p{N} toifasiga kiradi),
// tinish belgilari va kimyoviy formulalarda kerak bo'ladigan bir nechta
// qo'shimcha belgi (=, +, °, →, superscript/subscript +/-). Rasm —
// katakcha matniga umuman kirmagani uchun bu yerda alohida tekshirilmaydi.

// eslint-disable-next-line no-useless-escape
const RUXSAT_REGEX = /^[\p{L}\p{N}\s.,;:!?()[\]{}'"«»—\-/%=+°±→←×÷⁺⁻⁼⁽⁾₊₋₌₍₎]*$/u;

export const USTUNLAR = ["Savol", "To'g'ri javob", "Xato 1", "Xato 2", "Xato 3"];

/** Bitta katakcha matni ruxsat etilgan belgilardan iboratmi. */
export function matnRuxsatEtilganmi(matn) {
  return RUXSAT_REGEX.test(matn);
}

/**
 * Bitta Excel qatorini (5 ta katakcha: savol, to'g'ri, xato1-3) tekshiradi.
 * @param {Array<any>} qator
 * @param {number} qatorRaqami - xato xabarida ko'rsatiladigan Excel qator raqami
 * @returns {{ xatolar: string[], savol: object|null }}
 */
export function qatorniTekshirish(qator, qatorRaqami) {
  const xatolar = [];
  const qiymatlar = USTUNLAR.map((_, i) => String(qator[i] ?? "").trim());

  qiymatlar.forEach((qiymat, i) => {
    if (!qiymat) {
      xatolar.push(`${qatorRaqami}-qator: "${USTUNLAR[i]}" ustuni bo'sh`);
    } else if (!matnRuxsatEtilganmi(qiymat)) {
      xatolar.push(`${qatorRaqami}-qator: "${USTUNLAR[i]}" ustunida ruxsat etilmagan belgi bor`);
    }
  });

  if (xatolar.length > 0) {
    return { xatolar, savol: null };
  }

  const [matn, togri, xato1, xato2, xato3] = qiymatlar;
  return {
    xatolar: [],
    savol: {
      matn,
      variantlar: [togri, xato1, xato2, xato3],
      togriJavobIndex: 0, // to'g'ri javob har doim 0-indeksda; joyi test yechishda aralashtiriladi
    },
  };
}

/**
 * Excel'dan olingan xom qatorlar (sheet_to_json {header:1} natijasi,
 * sarlavha HALI olib tashlanmagan) asosida savollar va xatolar ro'yxatini
 * quradi.
 *
 * Eslatma: butunlay bo'sh qatorlar (fayl oxiridagi ortiqcha qatorlar kabi)
 * jim o'tkazib yuboriladi — faqat QISMAN to'ldirilgan (ba'zi ustuni bo'sh)
 * qatorlar xato hisoblanadi.
 *
 * @param {Array<Array<any>>} xomQatorlar
 * @returns {{ savollar: object[], xatolar: string[] }}
 */
export function excelQatorlariniQayta(xomQatorlar) {
  const dataQatorlari = (xomQatorlar || []).slice(1); // 1-qator (sarlavha) tashlanadi
  const savollar = [];
  const xatolar = [];

  dataQatorlari.forEach((qator, idx) => {
    const hammasiBosh = (qator || []).every((c) => String(c ?? "").trim() === "");
    if (hammasiBosh) return;

    const natija = qatorniTekshirish(qator, idx + 2); // +2: 1-sarlavha + 1-based
    if (natija.xatolar.length > 0) {
      xatolar.push(...natija.xatolar);
    } else {
      savollar.push(natija.savol);
    }
  });

  if (savollar.length === 0 && xatolar.length === 0) {
    xatolar.push("Faylda savollar topilmadi");
  }

  return { savollar, xatolar };
}
