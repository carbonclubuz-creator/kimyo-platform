// lib/vaqt.js
// Toshkent vaqti (Asia/Tashkent = UTC+5, yozgi vaqt YO'Q) bilan ishlash uchun
// sof yordamchilar. Nega kerak: Netlify serverlari odatda UTC'da ishlaydi,
// foydalanuvchilar esa O'zbekistonda — `setHours(0,0,0,0)` / `getHours()` kabi
// "server zonasi"ga bog'liq chaqiruvlar "Bugungi/Kechagi" chegarasini 05:00 ga,
// jonlar yangilanishini esa 12:00 ga surib yuborardi. Bu yerdagi funksiyalar
// faqat millisekund arifmetikasiga tayanadi, shuning uchun server/brauzer
// zonasi (TZ) o'zgarsa ham natija bir xil qoladi.
//
// Bu fayl client va server ikkalasida ham ishlatiladi (hech qanday
// server-only import yo'q).

export const TOSHKENT_ZONASI = "Asia/Tashkent";
const SOAT_MS = 60 * 60 * 1000;
export const KUN_MS = 24 * SOAT_MS;
// O'zbekiston 1991-yildan beri UTC+5 da, yozgi vaqtga o'tmaydi — qat'iy offset xavfsiz.
const TOSHKENT_OFFSET_MS = 5 * SOAT_MS;

/** Date'ni "Toshkent devor soati" bo'yicha siljitilgan UTC millisekundga aylantiradi. */
function toshkentMs(date) {
  return date.getTime() + TOSHKENT_OFFSET_MS;
}

/** Toshkent vaqti bilan shu kunning 00:00:00 payti (haqiqiy Date, UTC instant). */
export function toshkentKunBoshi(date = new Date()) {
  const t = toshkentMs(date);
  const kunBoshiSiljigan = Math.floor(t / KUN_MS) * KUN_MS;
  return new Date(kunBoshiSiljigan - TOSHKENT_OFFSET_MS);
}

/** Toshkent vaqti bilan soat (0–23). */
export function toshkentSoati(date = new Date()) {
  const t = toshkentMs(date);
  const kundagiMs = ((t % KUN_MS) + KUN_MS) % KUN_MS;
  return Math.floor(kundagiMs / SOAT_MS);
}

/** Toshkent vaqti bilan sana satri: "YYYY-MM-DD". */
export function toshkentSanaSatri(date = new Date()) {
  // Siljitilgan vaqtni UTC sifatida o'qisak — bu aynan Toshkent devor sanasi.
  return new Date(toshkentMs(date)).toISOString().slice(0, 10);
}

/**
 * Berilgan paytdan keyingi eng yaqin Toshkent `soat`:00 payti (qat'iy keyin —
 * hozir aynan shu soat bo'lsa, ertangisi). Bonus jon "keyingi jon
 * yangilanishigacha" (soat = 7) muddati uchun ishlatiladi.
 */
export function keyingiToshkentSoati(soat, date = new Date()) {
  const bugun = toshkentKunBoshi(date).getTime() + soat * SOAT_MS;
  const nomzod = bugun > date.getTime() ? bugun : bugun + KUN_MS;
  return new Date(nomzod);
}

// ---- Ko'rsatish (UI) uchun formatlar. Har doim timeZone aniq beriladi. ----

const formatlar = {};
function formatlovchi(kalit, options) {
  if (!formatlar[kalit]) {
    formatlar[kalit] = new Intl.DateTimeFormat("en-GB", {
      timeZone: TOSHKENT_ZONASI,
      hourCycle: "h23",
      ...options,
    });
  }
  return formatlar[kalit];
}

function qismlar(fmt, date) {
  const obj = {};
  for (const p of fmt.formatToParts(date)) obj[p.type] = p.value;
  return obj;
}

function togriDate(qiymat) {
  if (!qiymat) return null;
  const d = qiymat instanceof Date ? qiymat : new Date(qiymat);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "28.09.2026, 14:05" (Toshkent vaqti). Noto'g'ri/bo'sh qiymat uchun "—". */
export function toshkentSanaVaqt(qiymat) {
  const d = togriDate(qiymat);
  if (!d) return "—";
  const p = qismlar(
    formatlovchi("sanavaqt", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    d
  );
  return `${p.day}.${p.month}.${p.year}, ${p.hour}:${p.minute}`;
}

/** "28.09.2026" (Toshkent vaqti). */
export function toshkentSanaKorinish(qiymat) {
  const d = togriDate(qiymat);
  if (!d) return "—";
  const p = qismlar(
    formatlovchi("sana", { day: "2-digit", month: "2-digit", year: "numeric" }),
    d
  );
  return `${p.day}.${p.month}.${p.year}`;
}

/** "14:05" (Toshkent vaqti). */
export function toshkentSoatDaqiqa(qiymat) {
  const d = togriDate(qiymat);
  if (!d) return "—";
  const p = qismlar(formatlovchi("soat", { hour: "2-digit", minute: "2-digit" }), d);
  return `${p.hour}:${p.minute}`;
}

/** Soniyalarni "daq:son" ko'rinishiga o'giradi (masalan 307 -> "5:07"). */
export function davomiylikMatni(soniya) {
  if (soniya == null || Number.isNaN(soniya)) return "—";
  const jami = Math.max(0, Math.round(soniya));
  const daq = Math.floor(jami / 60);
  const son = jami % 60;
  return `${daq}:${String(son).padStart(2, "0")}`;
}
