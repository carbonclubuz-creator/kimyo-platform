// lib/pdfVaraqchalar.js
// O'quvchilarning login/parol varaqchalarini chop etish uchun PDF (4-bosqich).
// Format: A4 portret, 3 ustun × 5 qator = sahifasiga 15 ta varaqcha, har
// katak atrofida punktir qirqish chizig'i. Faqat brauzerda ishlaydi (client
// komponentdan chaqiriladi) va `jspdf` faqat funksiya ichida dinamik
// yuklanadi (SSR/bundle'ga tushmasin).
//
// SHRIFT (muhim): jsPDF'ning ichki shriftlari `ʻ` (U+02BB) va `ʼ` (U+02BC)
// belgilarini chiza olmaydi, login esa asl belgilar bilan saqlanadi. Shuning
// uchun Unicode TTF (OFL litsenziyali Noto Sans Regular + Bold) kerak:
//   public/fonts/NotoSans-Regular.ttf
//   public/fonts/NotoSans-Bold.ttf
// Fayl topilmasa yoki TTF bo'lmasa — ANIQ xato (ShriftTopilmadiXato). Belgini
// jimgina almashtirib (`ʻ` -> `'`) chop ETILMAYDI: noto'g'ri login bolani
// akkountidan qulflab qo'yadi.

export const SHRIFT_NOMI = "NotoSans";
export const SHRIFT_FAYLLARI = [
  { yol: "/fonts/NotoSans-Regular.ttf", vfsNomi: "NotoSans-Regular.ttf", uslub: "normal" },
  { yol: "/fonts/NotoSans-Bold.ttf", vfsNomi: "NotoSans-Bold.ttf", uslub: "bold" },
];

/** Shrift fayli topilmasa / yaroqsiz bo'lsa tashlanadi — PDF yaratilmaydi. */
export class ShriftTopilmadiXato extends Error {
  constructor(xabar) {
    super(xabar);
    this.name = "ShriftTopilmadiXato";
  }
}

// ---- Sahifa geometriyasi (mm) ----
export const SAHIFA_KENGLIGI = 210;
export const SAHIFA_BALANDLIGI = 297;
export const CHET = 10;
export const USTUNLAR = 3;
export const QATORLAR = 5;
export const SAHIFADA_VARAQCHA = USTUNLAR * QATORLAR; // 15
export const KATAK_KENGLIGI = (SAHIFA_KENGLIGI - 2 * CHET) / USTUNLAR; // ≈ 63.3
export const KATAK_BALANDLIGI = (SAHIFA_BALANDLIGI - 2 * CHET) / QATORLAR; // ≈ 55.4
const ICHKI_CHET = 5;

/** `indeks`-varaqcha qaysi sahifada va qayerda (chap-yuqori burchak, mm). */
export function katakJoyi(indeks) {
  const ichki = indeks % SAHIFADA_VARAQCHA;
  const ustun = ichki % USTUNLAR;
  const qator = Math.floor(ichki / USTUNLAR);
  return {
    sahifa: Math.floor(indeks / SAHIFADA_VARAQCHA),
    x: CHET + ustun * KATAK_KENGLIGI,
    y: CHET + qator * KATAK_BALANDLIGI,
  };
}

/** Sinf nomidan xavfsiz fayl nomi: "10-A" -> "10-A-varaqchalar.pdf". */
export function faylNomi(sinfNomi) {
  const toza = String(sinfNomi || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${toza || "sinf"}-varaqchalar.pdf`;
}

/**
 * Matn `maxKenglik` (mm) ga sig'guncha shriftni kichraytiradi (minimalgacha).
 * Joriy shrift oilasi/uslubi oldindan `doc.setFont` bilan o'rnatilgan bo'lishi
 * kerak. Qaytaradi: tanlangan shrift o'lchami (pt).
 */
export function shriftniMosla(doc, matn, maxKenglik, boshlangich, minimal) {
  let olcham = boshlangich;
  doc.setFontSize(olcham);
  while (olcham > minimal && doc.getTextWidth(matn) > maxKenglik) {
    olcham = Math.max(minimal, olcham - 0.5);
    doc.setFontSize(olcham);
  }
  return olcham;
}

/** ArrayBuffer -> base64 (katta fayllarda stack to'lmasligi uchun bo'lak-bo'lak). */
export function base64ga(buffer) {
  const baytlar = new Uint8Array(buffer);
  let satr = "";
  const BO_LAK = 0x8000;
  for (let i = 0; i < baytlar.length; i += BO_LAK) {
    satr += String.fromCharCode.apply(null, baytlar.subarray(i, i + BO_LAK));
  }
  return btoa(satr);
}

/** TrueType fayl imzosi: 00 01 00 00 yoki "true". (OTF/CFF va HTML rad etiladi.) */
function ttfmi(buffer) {
  if (buffer.byteLength < 12) return false;
  const b = new Uint8Array(buffer, 0, 4);
  const ochiq = b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00;
  const true_ = b[0] === 0x74 && b[1] === 0x72 && b[2] === 0x75 && b[3] === 0x65;
  return ochiq || true_;
}

const SHRIFT_KOMEK =
  "Noto Sans Regular va Bold (.ttf, OFL litsenziyasi) fayllarini loyihadagi " +
  "public/fonts/ papkasiga qo'ying (README.md'dagi \"PDF shrifti\" bo'limiga qarang).";

/**
 * Ikkala shriftni yuklab, jsPDF hujjatiga ulaydi. Topilmasa/yaroqsiz bo'lsa
 * aniq xato tashlaydi. `fetchFn` faqat sinov uchun almashtiriladi.
 */
export async function shriftlarniUla(doc, fetchFn = (...a) => fetch(...a)) {
  for (const f of SHRIFT_FAYLLARI) {
    let res;
    try {
      res = await fetchFn(f.yol);
    } catch {
      throw new ShriftTopilmadiXato(
        `Shrift faylini yuklab bo'lmadi (${f.yol}). Internet aloqasini tekshiring. ${SHRIFT_KOMEK}`
      );
    }
    if (!res.ok) {
      throw new ShriftTopilmadiXato(`Shrift fayli topilmadi: public${f.yol}. ${SHRIFT_KOMEK}`);
    }
    const buffer = await res.arrayBuffer();
    if (!ttfmi(buffer)) {
      throw new ShriftTopilmadiXato(
        `public${f.yol} haqiqiy TrueType (.ttf) shrift fayli emas ` +
          `(o'zgaruvchan yoki .otf/.woff shrift yoki noto'g'ri fayl bo'lishi mumkin). ${SHRIFT_KOMEK}`
      );
    }
    doc.addFileToVFS(f.vfsNomi, base64ga(buffer));
    doc.addFont(f.vfsNomi, SHRIFT_NOMI, f.uslub);
  }
}

/** Bitta varaqchani (katak ichini va qirqish chizig'ini) chizadi. */
function varaqchaChiz(doc, x, y, o, sinfNomi, sayt) {
  const ichkiKenglik = KATAK_KENGLIGI - 2 * ICHKI_CHET;
  const chapX = x + ICHKI_CHET;

  // Punktir qirqish chizig'i.
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(x, y, KATAK_KENGLIGI, KATAK_BALANDLIGI);
  doc.setLineDashPattern([], 0);

  // Ism-familiya (qalin): sig'masa kichraytiriladi (min 8 pt), baribir sig'masa 2 qatorga.
  const ismFamiliya = `${o.ism} ${o.familiya}`.trim();
  doc.setFont(SHRIFT_NOMI, "bold");
  doc.setTextColor(0);
  shriftniMosla(doc, ismFamiliya, ichkiKenglik, 14, 8);
  const ismQatorlari =
    doc.getTextWidth(ismFamiliya) > ichkiKenglik
      ? doc.splitTextToSize(ismFamiliya, ichkiKenglik).slice(0, 2)
      : [ismFamiliya];
  ismQatorlari.forEach((q, i) => doc.text(q, chapX, y + 8 + i * 3.6));

  // Login
  doc.setFont(SHRIFT_NOMI, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110);
  doc.text("Login", chapX, y + 17);
  doc.setFont(SHRIFT_NOMI, "bold");
  doc.setTextColor(0);
  shriftniMosla(doc, o.login, ichkiKenglik, 12, 8);
  doc.text(o.login, chapX, y + 22.5);

  // Parol — bolalar o'qiydi: katta va aniq.
  doc.setFont(SHRIFT_NOMI, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110);
  doc.text("Parol", chapX, y + 30.5);
  doc.setFont(SHRIFT_NOMI, "bold");
  doc.setTextColor(0);
  shriftniMosla(doc, o.parol, ichkiKenglik, 24, 12);
  doc.text(o.parol, chapX, y + 41);

  // Pastki yozuv: BirKuch · sinf nomi (+ sayt manzili).
  doc.setFont(SHRIFT_NOMI, "normal");
  doc.setTextColor(130);
  const pastki = `BirKuch · ${sinfNomi}`;
  shriftniMosla(doc, pastki, ichkiKenglik, 7, 6);
  doc.text(doc.splitTextToSize(pastki, ichkiKenglik)[0], chapX, y + 48);
  if (sayt) {
    shriftniMosla(doc, sayt, ichkiKenglik, 7, 6);
    doc.text(doc.splitTextToSize(sayt, ichkiKenglik)[0], chapX, y + 51.5);
  }
  doc.setTextColor(0);
}

/**
 * Hujjatga barcha varaqchalarni chizadi (shriftlar allaqachon ulangan bo'lishi
 * kerak). Ism-familiya alifbo bo'yicha; 15 tadan ko'p bo'lsa keyingi sahifa.
 * Jo'natilgan `doc` obyekti faqat jsPDF metodlariga tayanadi — shu sabab
 * sinov uchun soxta doc bilan tekshiriladi.
 */
export function varaqchalarniChiz(doc, { sinfNomi, royxat, sayt = "" }) {
  const tartiblangan = [...royxat].sort((a, b) =>
    `${a.ism} ${a.familiya}`.localeCompare(`${b.ism} ${b.familiya}`, "uz")
  );
  tartiblangan.forEach((o, i) => {
    const { x, y } = katakJoyi(i);
    if (i > 0 && i % SAHIFADA_VARAQCHA === 0) doc.addPage();
    varaqchaChiz(doc, x, y, o, sinfNomi, sayt);
  });
  return {
    varaqchalarSoni: tartiblangan.length,
    sahifalarSoni: Math.max(1, Math.ceil(tartiblangan.length / SAHIFADA_VARAQCHA)),
  };
}

/**
 * Asosiy funksiya: PDF yaratib, brauzerda yuklab olishni boshlaydi.
 * @param {{ sinfNomi: string, royxat: Array<{ism: string, familiya: string, login: string, parol: string}> }} p
 * @returns {Promise<{ fayl: string, varaqchalarSoni: number, sahifalarSoni: number }>}
 * @throws {ShriftTopilmadiXato} shrift fayllari topilmasa/yaroqsiz bo'lsa
 */
export async function varaqchalarPdf({ sinfNomi, royxat }) {
  if (!royxat || royxat.length === 0) {
    throw new Error("Chop etish uchun o'quvchi yo'q");
  }
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  await shriftlarniUla(doc);

  const sayt = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const natija = varaqchalarniChiz(doc, { sinfNomi, royxat, sayt });

  const fayl = faylNomi(sinfNomi);
  doc.save(fayl);
  return { fayl, ...natija };
}
