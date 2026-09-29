// app/api/admin/reset-password/route.js
// POST: admin (maxfiySoz orqali shaxsni Telegram'da qo'lda tasdiqlagach)
// tanlangan foydalanuvchiga yangi 8 xonali parol generatsiya qiladi va
// Firebase Auth'da yangilaydi. Faqat "teacher" yoki mustaqil
// ("student" + classId == null) foydalanuvchilar uchun ishlaydi — sinfga
// biriktirilgan o'quvchining parolini bu yerdan emas, faqat uning ustozi
// (app/api/teacher/reset-password) yangilay oladi.

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/apiAuth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { generatePassword } from "@/lib/accountHelpers";

export const runtime = "nodejs";

export async function POST(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  const uid = body?.uid;
  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ error: "Foydalanuvchi ko'rsatilmagan" }, { status: 400 });
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
  }
  const userData = userSnap.data();

  const ruxsatBorMi = userData.role === "teacher" || (userData.role === "student" && !userData.classId);
  if (!ruxsatBorMi) {
    return NextResponse.json(
      { error: "Bu foydalanuvchining parolini shu yerdan yangilab bo'lmaydi" },
      { status: 403 }
    );
  }

  const newPassword = generatePassword();
  await adminAuth.updateUser(uid, { password: newPassword });

  // Sinfdan chiqarilgan (avval ustoz yaratgan) o'quvchida eski parol matni
  // `currentPassword`da qolgan bo'lishi mumkin — u endi yaroqsiz, shuning
  // uchun o'chiramiz (hashteg oqimidagi ustoz tiklashi ham shunday qiladi).
  if (userData.currentPassword) {
    await adminDb.collection("users").doc(uid).update({ currentPassword: FieldValue.delete() });
  }

  return NextResponse.json({ password: newPassword });
}
