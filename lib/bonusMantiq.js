// lib/bonusMantiq.js
// Bonus jon (5A) uchun TOZA mantiq (Firestore'ga tegmaydi): "faol" ni
// hisoblash, admin kiritgan qiymatlarni validatsiya qilish va muddat
// (tugash vaqti)ni hisoblash. Server-only yordamchi lib/bonusHelpers.js shundan
// foydalanadi; toza bo'lgani uchun alohida sinaladi.

import { JON_YANGILANISH_SOATI } from "./heartsHelpers";
import { KUN_MS, keyingiToshkentSoati } from "./vaqt";

export const BONUS_SONI_MIN = 1;
export const BONUS_SONI_MAX = 5;
export const XABAR_MAX_UZUNLIK = 80;

export const MUDDAT_VARIANTLARI = [
  { key: "yangilanishgacha", label: "Ertaga 07:00 gacha" },
  { key: "3kun", label: "3 kun" },
  { key: "qolda", label: "Qo'lda o'chirgunimcha" },
];

/** Firestore Timestamp/Date -> Date | null */
function sanaga(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  return ts instanceof Date ? ts : null;
}

/**
 * `sozlamalar/bonusJon` hujjatidan (yoki undefined) joriy holatni hisoblaydi.
 * "Faol" = faol === true VA (tugash yo'q YOKI hozir < tugash). Muddat o'tsa
 * avtomatik o'chgan hisoblanadi (cron shart emas). Faol bo'lmasa soni = 0.
 * @returns {{ faol: boolean, soni: number, xabar: string, tugash: Date | null }}
 */
export function bonusniHisobla(data, now = new Date()) {
  if (!data || data.faol !== true) return { faol: false, soni: 0, xabar: "", tugash: null };
  const tugash = sanaga(data.tugash);
  if (tugash && now.getTime() >= tugash.getTime()) {
    return { faol: false, soni: 0, xabar: "", tugash };
  }
  const soni = Number.isInteger(data.soni) ? data.soni : 0;
  if (soni < BONUS_SONI_MIN || soni > BONUS_SONI_MAX) {
    return { faol: false, soni: 0, xabar: "", tugash };
  }
  return { faol: true, soni, xabar: typeof data.xabar === "string" ? data.xabar : "", tugash };
}

/** Muddat kalitiga mos tugash vaqti (Date) yoki null ("qolda"). Noma'lum kalit -> undefined. */
export function tugashniHisobla(muddat, now = new Date()) {
  if (muddat === "yangilanishgacha") return keyingiToshkentSoati(JON_YANGILANISH_SOATI, now);
  if (muddat === "3kun") return new Date(now.getTime() + 3 * KUN_MS);
  if (muddat === "qolda") return null;
  return undefined;
}

/**
 * Admin POST tanasini tekshiradi.
 * @returns {{ ok: true, faol: false } | { ok: true, faol: true, soni, muddat, xabar } | { ok: false, error }}
 */
export function bonusSorovniTekshir(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Noto'g'ri so'rov" };
  if (body.faol === false) return { ok: true, faol: false };
  if (body.faol !== true) return { ok: false, error: "faol true yoki false bo'lishi kerak" };

  const soni = body.soni;
  if (!Number.isInteger(soni) || soni < BONUS_SONI_MIN || soni > BONUS_SONI_MAX) {
    return { ok: false, error: `Bonus jon soni ${BONUS_SONI_MIN}–${BONUS_SONI_MAX} orasidagi butun son bo'lsin` };
  }
  if (!MUDDAT_VARIANTLARI.some((m) => m.key === body.muddat)) {
    return { ok: false, error: "Muddat noto'g'ri" };
  }
  let xabar = "";
  if (body.xabar !== undefined && body.xabar !== null) {
    if (typeof body.xabar !== "string") return { ok: false, error: "Xabar matn bo'lishi kerak" };
    xabar = body.xabar.trim();
    if (xabar.length > XABAR_MAX_UZUNLIK) {
      return { ok: false, error: `Xabar ${XABAR_MAX_UZUNLIK} belgidan oshmasin` };
    }
  }
  return { ok: true, faol: true, soni, muddat: body.muddat, xabar };
}
