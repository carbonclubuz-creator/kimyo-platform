// types.ts
// Firestore kolleksiyalari uchun tip ta'riflari (MVP).
// Bu fayl faqat tip tekshiruvi/IDE yordami uchun — runtime'da hech narsani o'zgartirmaydi.

import type { Timestamp } from "firebase/firestore";

export type UserRole = "student" | "teacher";

/** users kolleksiyasi — document ID = Firebase Auth UID */
export interface UserDoc {
  uid: string;
  role: UserRole;
  ism: string;
  familiya: string;
  /** Ko'rsatish uchun asl login (masalan "MurodbekErgashev47") */
  login: string;
  viloyat: string;
  tuman: string;
  /** Faqat teacher uchun */
  maktabMarkaz?: string;
  /** Faqat teacher uchun (parolni tiklashda ishlatiladigan maxfiy so'z) */
  maxfiySoz?: string;
  /** Faqat student uchun — qaysi sinfga tegishli */
  classId: string | null;
  /**
   * Faqat ustoz tomonidan yaratilgan o'quvchilar uchun — joriy parol ochiq
   * matnda saqlanadi, chunki ustoz uni istalgan payt sinf jadvalida ko'ra
   * olishi kerak (ko'z ikonkasi bilan yashirin/ko'rsatilgan). Faqat
   * app/api/teacher/** route'lari (Firebase Admin SDK) orqali yoziladi.
   */
  currentPassword?: string;
  umumiyBali: number;
  createdAt: Timestamp;
}

/** classes kolleksiyasi */
export interface ClassDoc {
  id: string;
  nomi: string; // masalan "10-A"
  teacherId: string; // users collection'dagi UID
  createdAt: Timestamp;
}

/** mavzular kolleksiyasi */
export interface MavzuDoc {
  id: string;
  nomi: string; // masalan "Mol tushunchasi"
  tartib: number;
}

/** savollar kolleksiyasi */
export interface SavolDoc {
  id: string;
  mavzuId: string;
  matn: string;
  variantlar: [string, string, string, string]; // 4 ta variant
  togriJavobIndex: 0 | 1 | 2 | 3;
}

export type UrinishHolati = "jarayonda" | "tugallangan";

/** urinishlar kolleksiyasi — har bir test urinishi */
export interface UrinishDoc {
  id: string;
  studentId: string;
  mavzuId: string;
  boshlanganVaqt: Timestamp;
  holati: UrinishHolati;
  togriSoni: number;
  jamiSavol: number;
  /** Har bir savol uchun tanlangan variant indeksi (0-3) */
  javoblar: number[];
}

/** jonlar — users sub-document yoki alohida collection */
export interface JonDoc {
  studentId: string;
  sana: string; // YYYY-MM-DD
  ishlatilgan: number; // 0-5
}
