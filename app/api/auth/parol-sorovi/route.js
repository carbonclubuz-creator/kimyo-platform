// app/api/auth/parol-sorovi/route.js
// POST { login, maxfiySoz } — OMMAVIY endpoint (foydalanuvchi parolini unutgan,
// demak tizimga kira olmaydi). Faqat hashteg orqali sinfga qo'shilgan
// mustaqil o'quvchi uchun ishlaydi: login + maxfiy so'z mos kelsa, so'rov
// ustozning Xabarlar bo'limiga tushadi (0-QISM 4/7-band).
//
// Xavfsizlik: javob HAR DOIM bir xil ({ ok: true }) — tashqaridan login
// mavjudligini yoki maxfiy so'z to'g'ri-noto'g'riligini bilib bo'lmasin.
// So'rov o'zi parolni o'zgartirmaydi: yangilashni faqat ustoz bajaradi.
// Bir o'quvchidan bittadan ortiq faol so'rov yaratilmaydi.

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { maxfiySozniTenglashtir } from "@/lib/hashteg";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const login = String(body?.login ?? "").trim();
  const maxfiySoz = maxfiySozniTenglashtir(body?.maxfiySoz);

  if (!login || !maxfiySoz) {
    return NextResponse.json({ error: "Login va maxfiy so'zni kiriting" }, { status: 400 });
  }

  const umumiyJavob = NextResponse.json({ ok: true });

  const userSnap = await adminDb
    .collection("users")
    .where("loginLower", "==", login.toLowerCase())
    .limit(1)
    .get();
  if (userSnap.empty) return umumiyJavob;

  const uid = userSnap.docs[0].id;
  const u = userSnap.docs[0].data();

  const mosMi =
    u.role === "student" &&
    u.classId &&
    u.qoshilishUsuli === "hashteg" &&
    u.maxfiySoz &&
    maxfiySozniTenglashtir(u.maxfiySoz) === maxfiySoz;
  if (!mosMi) return umumiyJavob;

  const classSnap = await adminDb.collection("classes").doc(u.classId).get();
  if (!classSnap.exists) return umumiyJavob;

  const msgRef = adminDb.collection("messages").doc(`reset_${uid}`);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    await msgRef.set({
      tur: "parol_tiklash",
      teacherId: classSnap.data().teacherId,
      studentId: uid,
      studentIsm: u.ism || "",
      studentFamiliya: u.familiya || "",
      classId: u.classId,
      classNomi: classSnap.data().nomi || "",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return umumiyJavob;
}
