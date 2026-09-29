// lib/nomTenglashtir.js
// Ism/familiyani solishtirish uchun SOF yordamchilar (client va server ikkalasida
// ishlaydi). Parolni tiklash so'rovida o'quvchi ism-familiyani qanday yozgan
// bo'lsa-yu (katta-kichik harf, o' / oʻ / o` apostrof variantlari), bazadagi
// akkount bilan moslashtirish uchun kerak — kirishdagi (login) mantiqqa mos:
// registr va apostrof turi e'tiborga olinmaydi.

const APOSTROF_BELGILAR = ["'", "ʻ", "ʼ", "`"];
const APOSTROF_REGEX = /['ʻʼ`]/g;

/** "O'rinboyev" / "Oʻrinboyev" / "o`rinboyev" -> "o'rinboyev" */
export function nomniNormallashtir(xom) {
  return String(xom ?? "")
    .trim()
    .toLowerCase()
    .replace(APOSTROF_REGEX, "'");
}

/**
 * Bazada saqlanishi mumkin bo'lgan barcha yozilish variantlarini qaytaradi:
 * birinchi harf katta, qolgani kichik (validateIsmFamiliya shunday saqlaydi),
 * har bir apostrof 4 xil belgidan biri bo'lishi mumkin. Firestore `in` so'rovi
 * uchun (ko'pi bilan 30 ta qiymat).
 *
 * Apostroflar ko'p bo'lib variantlar 30 tadan oshsa `null` qaytaradi — chaqiruvchi
 * bu holatda kengroq so'rov qilib, xotirada filtrlaydi.
 *
 * @returns {string[] | null}
 */
export function nomVariantlari(xom, chegara = 30) {
  const norm = nomniNormallashtir(xom);
  if (!norm) return [];
  const qismlar = norm.split("'");
  const apostroflarSoni = qismlar.length - 1;
  if (Math.pow(APOSTROF_BELGILAR.length, apostroflarSoni) > chegara) return null;

  let variantlar = [qismlar[0]];
  for (let i = 1; i < qismlar.length; i += 1) {
    const yangi = [];
    for (const v of variantlar) {
      for (const a of APOSTROF_BELGILAR) {
        yangi.push(`${v}${a}${qismlar[i]}`);
      }
    }
    variantlar = yangi;
  }
  return [...new Set(variantlar.map((v) => v.charAt(0).toUpperCase() + v.slice(1)))];
}
