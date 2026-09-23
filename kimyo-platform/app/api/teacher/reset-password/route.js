// app/api/teacher/reset-password/route.js
// POST: ustoz istalgan payt o'z o'quvchisiga yangi 8 xonali parol
// generatsiya qiladi. Firebase client SDK'da "boshqa odamning" parolini
// yangilashning imkoni yo'q (faqat joriy sessiya egasi o'zinikini
// yangilay oladi) — shuning uchun Admin SDK orqali serverda bajariladi.

import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/apiAuth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { generatePassword } from "@/lib/accountHelpers";

export const runtime = "nodejs";

export async function POST(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const body = await request.json().catch(() => null);
  const studentUid = body?.studentUid;
  if (!studentUid || typeof studentUid !== "string") {
    return NextResponse.json({ error: "O'quvchi ko'rsatilmagan" }, { status: 400 });
  }

  const studentSnap = await adminDb.collection("users").doc(studentUid).get();
  if (!studentSnap.exists || studentSnap.data().role !== "student") {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }
  const studentData = studentSnap.data();

  // O'quvchi shu ustozning sinfiga tegishli ekanini tekshiramiz — boshqa
  // ustozning yoki mustaqil (classId == null) o'quvchining parolini
  // yangilab bo'lmasin.
  if (!studentData.classId) {
    return NextResponse.json(
      { error: "O'quvchi hech qanday sinfga bog'lanmagan" },
      { status: 403 }
    );
  }
  const classSnap = await adminDb.collection("classes").doc(studentData.classId).get();
  if (!classSnap.exists || classSnap.data().teacherId !== teacherUid) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const newPassword = generatePassword();
  await adminAuth.updateUser(studentUid, { password: newPassword });
  await adminDb.collection("users").doc(studentUid).update({ currentPassword: newPassword });

  return NextResponse.json({ password: newPassword });
}
