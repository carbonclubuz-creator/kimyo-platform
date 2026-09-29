// lib/parolMoslik.js
// SERVER uchun: parol tiklash so'roviga (rol, ism, familiya, viloyat) mos keladigan
// foydalanuvchilarni bazadan topadi. Ikki joyda ishlatiladi:
//   - app/api/admin/parol-sorovlari (admin ro'yxati uchun),
//   - app/api/auth/mustaqil-parol-sorovi (bazada shunday odam yo'q bo'lsa so'rov
//     yozilmaydi — shu tufayli begona odam ro'yxatni yolg'on so'rov bilan to'ldira olmaydi).
//
// Moslik: rol (o'quvchi -> mustaqil student, classId yo'q; ustoz -> teacher),
// viloyat aynan teng, ism va familiya katta-kichik harf va apostrof turiga
// e'tiborsiz teng. Qidiruv `viloyat == X` + `familiya in [variantlar]` bilan
// bajariladi (butun kolleksiya o'qilmaydi), ism esa xotirada tekshiriladi.

import { adminDb } from "@/lib/firebaseAdmin";
import { nomniNormallashtir, nomVariantlari } from "@/lib/nomTenglashtir";

export async function mosFoydalanuvchilar(sorov) {
  const talabRole = sorov.rol === "ustoz" ? "teacher" : "student";

  let q = adminDb.collection("users").where("viloyat", "==", sorov.viloyat);
  const variantlar = nomVariantlari(sorov.familiya);
  // variantlar === null: apostroflar ko'p — kengroq (faqat viloyat) so'rov, keyin xotirada filtr.
  if (variantlar) {
    if (variantlar.length === 0) return [];
    q = q.where("familiya", "in", variantlar);
  }
  const snap = await q.get();

  const ismN = nomniNormallashtir(sorov.ism);
  const familiyaN = nomniNormallashtir(sorov.familiya);

  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => {
      if (u.role !== talabRole) return false;
      // O'quvchi so'rovi faqat MUSTAQIL o'quvchilar uchun: sinfdagi o'quvchining
      // parolini ustozi tiklaydi.
      if (talabRole === "student" && u.classId) return false;
      return nomniNormallashtir(u.ism) === ismN && nomniNormallashtir(u.familiya) === familiyaN;
    })
    .map((u) => ({
      uid: u.uid,
      role: u.role,
      ism: u.ism,
      familiya: u.familiya,
      login: u.login,
      viloyat: u.viloyat,
      tuman: u.tuman || "",
      maktabMarkaz: u.maktabMarkaz || null,
      maxfiySoz: u.maxfiySoz || null,
      // Faqat ustoz tomonidan yaratilib, keyin sinfdan chiqarilgan o'quvchilarda
      // saqlanib qolgan bo'lishi mumkin; o'zi ro'yxatdan o'tganlarda yo'q.
      mavjudParol: u.currentPassword || null,
    }));
}
