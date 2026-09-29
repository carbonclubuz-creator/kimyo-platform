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
   * Faqat student uchun, sinfga qanday qo'shilgani: "ustoz" — ustoz o'zi
   * qo'shgan (parolini ustoz istalgan payt yangilay oladi); "hashteg" —
   * mustaqil o'quvchi hashteg orqali qo'shilgan (parolni ustoz FAQAT
   * o'quvchi so'rov yuborganda yangilaydi). Faqat serverda yoziladi.
   */
  qoshilishUsuli?: "ustoz" | "hashteg";
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
  /** Noyob 6 xonali raqam — mustaqil o'quvchi shu kod bilan qo'shilish so'rovi yuboradi */
  hashteg?: string;
  createdAt: Timestamp;
}

export type XabarTuri = "sinfga_qoshilish" | "parol_tiklash" | "admin_javob";

/**
 * messages kolleksiyasi — ustozning Xabarlari (faqat server orqali).
 * Faqat kutilayotgan xabarlar saqlanadi: qabul/rad/bajarildi bo'lganda
 * hujjat o'chiriladi. ID: `join_{studentUid}` yoki `reset_{studentUid}`.
 */
export interface XabarDoc {
  tur: XabarTuri;
  teacherId: string;
  /** sinfga_qoshilish / parol_tiklash uchun (admin_javob'da yo'q) */
  studentId?: string;
  studentIsm?: string;
  studentFamiliya?: string;
  classId?: string;
  classNomi?: string;
  /** Faqat admin_javob: adminning javobi (o'zi o'chib ketmaydi, ustoz o'chiradi) */
  matn?: string;
  /** Faqat admin_javob: ustozning asl xabari boshi (<= 200 belgi) */
  asliMatn?: string;
  /** Faqat admin_javob: ustoz Xabarlar sahifasini ochganmi (qizil belgi uchun) */
  oqilgan?: boolean;
  createdAt: Timestamp;
}

/**
 * parolSorovlari kolleksiyasi — mustaqil o'quvchi/ustozning admin panelidagi
 * parol tiklash so'rovi (faqat server). ID = sha1(rol|ism|familiya|viloyat)
 * — bir odamdan bitta so'rov. Admin "Bajarildi" bosganda o'chadi.
 */
export interface ParolSorovDoc {
  rol: "oquvchi" | "ustoz";
  ism: string;
  familiya: string;
  viloyat: string;
  createdAt: Timestamp;
}

/**
 * ustozXabarlari kolleksiyasi — ustozdan adminga xabar (faqat server).
 * Admin javobi ustozning `messages` kolleksiyasiga (tur = "admin_javob") yoziladi.
 */
export interface UstozXabarDoc {
  teacherId: string;
  teacherIsm: string;
  teacherFamiliya: string;
  teacherLogin: string;
  matn: string;
  javobBerilgan: boolean;
  javoblar: { matn: string; vaqt: Timestamp }[];
  createdAt: Timestamp;
}

/** joinRequests kolleksiyasi — ID = o'quvchi UID (bir vaqtda bitta so'rov) */
export interface JoinRequestDoc {
  studentId: string;
  classId: string;
  classNomi: string;
  teacherId: string;
  holati: "kutilmoqda" | "rad_etildi";
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
  /** Faqat tugallangan urinishda — oxirgi savolga javob berilgan payt (serverda yoziladi) */
  tugallanganVaqt?: Timestamp;
  holati: UrinishHolati;
  togriSoni: number;
  jamiSavol: number;
  /** Har bir savol uchun tanlangan variant indeksi (0-3) */
  javoblar: number[];
  /** Urinish boshlanganda aralashtirilgan savol ID'lari tartibi (faqat serverda) */
  savolTartibi?: string[];
  /** savolId -> aralashtirilgan variantlarning ASL indekslari [0-3 permutatsiyasi] (faqat serverda) */
  variantTartiblari?: Record<string, number[]>;
}

/** jonlar — users sub-document yoki alohida collection */
export interface JonDoc {
  studentId: string;
  sana: string; // YYYY-MM-DD
  ishlatilgan: number; // 0-5
}

/**
 * sozlamalar/bonusJon — bitta hujjat (faqat serverdan o'qiladi/yoziladi,
 * app/api/admin/bonus). "Faol" = faol === true VA (tugash yo'q YOKI hozir < tugash);
 * muddat o'qishda tekshiriladi (cron kerak emas).
 */
export interface BonusJonDoc {
  faol: boolean;
  /** 1–5 */
  soni: number;
  /** O'quvchi bosh sahifasidagi e'lon matni, ≤ 80 belgi (ixtiyoriy) */
  xabar: string;
  yoqilganVaqt: Timestamp;
  /** null = qo'lda o'chirilgunicha */
  tugash: Timestamp | null;
}
