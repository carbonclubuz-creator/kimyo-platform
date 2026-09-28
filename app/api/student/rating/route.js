// app/api/student/rating/route.js
// GET ?scope=global|sinf & davr=bugungi|kechagi|haftalik|umumiy|mavzu (&mavzuId=...)
// Reyting ro'yxatini qaytaradi (0-QISM 6.5-band). Boshqa o'quvchi haqida
// FAQAT ism + ball/pozitsiya qaytariladi — shaxsiy tafsilotlar (urinishlar,
// vaqt, qaysi javoblarni xato qilgani) hech qachon bu yerdan chiqmaydi.
//
// Composite index shart bo'lmasligi uchun (loyihadagi mavjud naqsh —
// testEngine.js'ga qarang), barcha "tugallangan" urinishlarni olib, kerakli
// o'quvchilarga xotirada filtrlaymiz. Foydalanuvchilar soni sezilarli
// oshsa, bu yerga composite index + range query qo'shish tavsiya etiladi.

import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  davrBoyichaBalllar,
  davrOraligi,
  mavzuBoyichaEngYuqoriFoizlar,
} from "@/lib/reytingHelpers";

export const runtime = "nodejs";

const RUXSAT_ETILGAN_DAVRLAR = ["bugungi", "kechagi", "haftalik", "umumiy", "mavzu"];

export async function GET(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { studentUid, studentData } = authResult;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "sinf" ? "sinf" : "global";
  const davrParam = searchParams.get("davr") || "haftalik";
  const davr = RUXSAT_ETILGAN_DAVRLAR.includes(davrParam) ? davrParam : "haftalik";
  const mavzuId = searchParams.get("mavzuId") || "";

  // Mavzular ro'yxati har doim qaytariladi — frontend "Mavzular" tabidagi
  // tanlov ro'yxatini shundan quradi.
  const mavzuSnap = await adminDb.collection("mavzular").orderBy("tartib").get();
  const mavzular = mavzuSnap.docs.map((d) => ({ id: d.id, nomi: d.data().nomi }));

  if (scope === "sinf" && !studentData.classId) {
    return NextResponse.json({ ok: true, reason: "no-class", royxat: [], mavzular });
  }

  const studentsSnap =
    scope === "sinf"
      ? await adminDb
          .collection("users")
          .where("role", "==", "student")
          .where("classId", "==", studentData.classId)
          .get()
      : await adminDb.collection("users").where("role", "==", "student").get();

  const talabgorlar = new Map(); // studentId -> {ism, familiya}
  studentsSnap.docs.forEach((d) => {
    const u = d.data();
    talabgorlar.set(d.id, { ism: u.ism || "", familiya: u.familiya || "" });
  });

  const urinishSnap = await adminDb.collection("urinishlar").where("holati", "==", "tugallangan").get();
  const urinishlar = urinishSnap.docs
    .map((d) => d.data())
    .filter((u) => talabgorlar.has(u.studentId));

  let ballarMap;
  let birlik = "ball";
  if (davr === "mavzu") {
    birlik = "%";
    if (!mavzuId) {
      return NextResponse.json({ ok: true, royxat: [], mavzular, birlik });
    }
    ballarMap = mavzuBoyichaEngYuqoriFoizlar(urinishlar, mavzuId);
  } else {
    ballarMap = davrBoyichaBalllar(urinishlar, davrOraligi(davr));
  }

  const royxat = [];
  for (const [studentId, info] of talabgorlar) {
    royxat.push({
      studentId,
      ism: info.ism,
      familiya: info.familiya,
      ball: ballarMap.get(studentId) || 0,
    });
  }
  royxat.sort((a, b) => b.ball - a.ball);
  royxat.forEach((r, i) => {
    r.pozitsiya = i + 1;
    r.isSelf = r.studentId === studentUid;
  });

  return NextResponse.json({ ok: true, royxat, mavzular, birlik });
}
