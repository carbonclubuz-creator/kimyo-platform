// app/api/teacher/stats/student/route.js
// GET ?classId=...&studentId=...&davr=...&mavzuId=...
// Bitta o'quvchining urinishlar tarixi va xulosasi — FAQAT ustozga.
//
// Izolyatsiya: sinf shu ustozniki VA o'quvchining classId'si aynan shu sinf
// bo'lishi shart, aks holda 404 (boshqa ustoz o'quvchisi haqida hech narsa
// qaytmaydi). Parol bu yerdan QAYTARILMAYDI — ustoz sahifasi uni Firestore'dan
// (o'z o'quvchisi uchun rules ruxsat beradi) o'qiydi.

import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { ustozOquvchisi } from "@/lib/sinfEgaligi";
import { davrniTozala, oquvchiTarixi } from "@/lib/statistikaHelpers";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId") || "";
  const studentId = searchParams.get("studentId") || "";
  const davr = davrniTozala(searchParams.get("davr") || "haftalik");
  const mavzuId = searchParams.get("mavzuId") || "";

  const topilgan = await ustozOquvchisi(classId, studentId, teacherUid);
  if (!topilgan) {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }
  const { oquvchi } = topilgan;

  const [mavzuSnap, urinishSnap] = await Promise.all([
    adminDb.collection("mavzular").orderBy("tartib").get(),
    adminDb.collection("urinishlar").where("studentId", "==", studentId).get(),
  ]);
  const mavzular = mavzuSnap.docs.map((d) => ({ id: d.id, nomi: d.data().nomi }));
  const mavzuNomlari = Object.fromEntries(mavzular.map((m) => [m.id, m.nomi]));
  const urinishlar = urinishSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const { xulosa, urinishlar: tarix } = oquvchiTarixi({
    studentId,
    urinishlar,
    mavzuNomlari,
    davr,
    mavzuId,
  });

  return NextResponse.json({
    ok: true,
    oquvchi: { studentId, ism: oquvchi.ism || "", familiya: oquvchi.familiya || "" },
    xulosa,
    urinishlar: tarix,
    mavzular,
    birlik: davr === "mavzu" ? "%" : "ball",
  });
}
