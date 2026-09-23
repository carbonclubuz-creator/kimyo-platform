// lib/accountHelpers.js
// Ism/familiya validatsiyasi, parol generatsiyasi, login -> soxta email o'girish
// va unikal login bilan Firebase Auth akkount yaratish.
// Barcha qoidalar 0-QISM (Asosiy biznes qoidalari, 1-4-band) ga muvofiq.

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

// Uzbek lotin alifbosida ishlatiladigan apostrof variantlari (o', g' uchun)
const APOSTROPHE_CHARS = /['ʻʼ`]/g;

/**
 * Ism yoki familiya uchun validatsiya (0-QISM, 3-band):
 * - kamida 3 harf
 * - bitta so'z (probel bo'lmasin)
 * - faqat lotin harflari + o', g', ' belgilari
 * - raqam yoki boshqa belgi yo'q
 *
 * Muvaffaqiyatli bo'lsa { valid: true, value } qaytaradi, bunda `value`
 * birinchi harfi katta, qolgani kichik qilingan holat (masalan "murodbek" -> "Murodbek").
 */
export function validateIsmFamiliya(raw) {
  const value = (raw || "").trim();

  if (!value) {
    return { valid: false, error: "Bu maydon to'ldirilishi shart" };
  }
  if (/\s/.test(value)) {
    return { valid: false, error: "Bo'sh joy bo'lmasligi kerak (bitta so'z)" };
  }
  if (!/^[A-Za-z'ʻʼ`]+$/.test(value)) {
    return {
      valid: false,
      error:
        "Faqat lotin harflari (va o', g' belgilari) ishlatilsin — raqam yoki boshqa belgi bo'lmasin",
    };
  }

  const lettersOnly = value.replace(APOSTROPHE_CHARS, "");
  if (lettersOnly.length < 3) {
    return { valid: false, error: "Kamida 3 ta harf bo'lishi kerak" };
  }

  return { valid: true, value: capitalizeFirst(value) };
}

/** Birinchi harfni katta, qolganini kichik qiladi. */
export function capitalizeFirst(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** 8 xonali tasodifiy raqamli parol (string sifatida, noldan boshlanishi mumkin). */
export function generatePassword() {
  let pass = "";
  for (let i = 0; i < 8; i += 1) {
    pass += Math.floor(Math.random() * 10).toString();
  }
  return pass;
}

/**
 * Login'ni Firebase Auth uchun soxta email formatga o'giradi (0-QISM, 4-band).
 * Kirishda solishtirish katta-kichik harfga sezgir bo'lmasligi uchun email
 * har doim lowercase yasaladi; apostroflar email uchun xavfsiz "-" belgisiga
 * almashtiriladi (foydalanuvchiga ko'rsatiladigan `login` asl holicha qoladi).
 */
export function loginToAuthEmail(login) {
  const local = login.toLowerCase().replace(APOSTROPHE_CHARS, "-");
  return `${local}@platforma.uz`;
}

/**
 * Ism+Familiya asosida login yaratadi va shu login bilan Firebase Auth'da
 * akkount ochadi (0-QISM, 1-band). Login band bo'lsa (Firebase
 * "auth/email-already-in-use" xatosi orqali aniqlanadi — email login'dan
 * deterministik yasalgani uchun bu aynan login band degani), oxiriga
 * tasodifiy 2 xonali raqam qo'shib, bo'sh chiqquncha qayta urinadi.
 * teacher uchun prefix = "Ustoz".
 *
 * Muvaffaqiyatli bo'lsa { login, cred } qaytaradi (cred — Firebase
 * UserCredential; cred.user.uid — yangi akkountning UID'i).
 */
export async function createAccountWithUniqueLogin({
  ismCap,
  familiyaCap,
  prefix = "",
  password,
  maxAttempts = 25,
}) {
  const base = `${prefix}${ismCap}${familiyaCap}`;
  let candidate = base;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    const email = loginToAuthEmail(candidate);
    try {
      // eslint-disable-next-line no-await-in-loop
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return { login: candidate, cred };
    } catch (err) {
      if (err && err.code === "auth/email-already-in-use") {
        const suffix = String(Math.floor(Math.random() * 100)).padStart(2, "0");
        candidate = `${base}${suffix}`;
      } else {
        throw err;
      }
    }
  }

  throw new Error("Unikal login yaratib bo'lmadi, qayta urinib ko'ring.");
}
