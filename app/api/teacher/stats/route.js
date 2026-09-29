// app/api/teacher/stats/route.js
// GET ?classId=...&davr=haftalik|bugungi|kechagi|umumiy|mavzu (&mavzuId=...)
// Ustozga o'z sinfining to'liq statistikasi: har o'quvchi uchun ball (yoki
// "Mavzular" tabida foiz), urinishlar soni, tugallangan/tugallanmagan soni va
// oxirgi faollik vaqti. Test ishlamagan o'quvchi ham 0 ball bilan ro'yxatda.
//
// Ball hisobi reyting bilan bir xil (lib/reytingHelpers.js), hisoblash
// mantig'i lib/statistikaHelpers.js'da. Composite index shart emas: oddiy
// `where` (studentId `in`, 30 tadan bo'laklab) + qolganini xotirada filtrlaymiz.

import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { ustozSinfi } from "@/lib/sinfEgaligi";
import { bolaklarga, davrniTozala, sinfStatistikasi } from "@/lib/statistikaHelpers";

export const runtime = "nodejs";

// Firestore `in` so'rovi ko'pi bilan 30 ta qiymat qabul qiladi.
const IN_LIMITI = 30;

export async function GET(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId") || "";
  const davr = davrniTozala(searchParams.get("davr") || "haftalik");
  const mavzuId = searchParams.get("mavzuId") || "";

  const sinf = await ustozSinfi(classId, teacherUid);
  if (!sinf) {
    return NextResponse.json({ error: "Sinf topilmadi" }, { status: 404 });
  }

  const [mavzuSnap, oquvchiSnap] = await Promise.all([
    adminDb.collection("mavzular").orderBy("tartib").get(),
    adminDb.collection("users").where("role", "==", "student").where("classId", "==", classId).get(),
  ]);
  const mavzular = mavzuSnap.docs.map((d) => ({ id: d.id, nomi: d.data().nomi }));
  const oquvchilar = oquvchiSnap.docs.map((d) => ({
    id: d.id,
    ism: d.data().ism || "",
    familiya: d.data().familiya || "",
  }));

  // Sinf o'quvchilarining urinishlari — 30 tadan bo'laklab, parallel.
  const bolaklar = bolaklarga(
    oquvchilar.map((o) => o.id),
    IN_LIMITI
  );
  const urinishSnaplar = await Promise.all(
    bolaklar.map((idlar) => adminDb.collection("urinishlar").where("studentId", "in", idlar).get())
  );
  const urinishlar = urinishSnaplar.flatMap((snap) => snap.docs.map((d) => d.data()));

  const { royxat, birlik } = sinfStatistikasi({ oquvchilar, urinishlar, davr, mavzuId });

  return NextResponse.json({ ok: true, royxat, mavzular, birlik });
}
