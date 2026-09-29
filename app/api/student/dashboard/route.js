// app/api/student/dashboard/route.js
// GET: o'quvchining asosiy sahifasi uchun kerakli hammasi bir so'rovda —
// mavzular ro'yxati (har birida eng yuqori foiz, agar bo'lsa) va qolgan
// jonlar soni. Admin SDK orqali (client Firestore qoidalari bu yerga
// aralashmaydi — savollar/urinishlar endi faqat serverdan o'qiladi).

import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { jonHolatiniOl } from "@/lib/testEngine";
import { davrBoyichaBalllar, davrOraligi } from "@/lib/reytingHelpers";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { studentUid } = authResult;

  const [mavzuSnap, urinishSnap, jonHolati] = await Promise.all([
    adminDb.collection("mavzular").orderBy("tartib").get(),
    adminDb.collection("urinishlar").where("studentId", "==", studentUid).get(),
    jonHolatiniOl(studentUid),
  ]);

  const engYuqoriFoizlar = {};
  urinishSnap.docs.forEach((d) => {
    const u = d.data();
    if (u.holati !== "tugallangan" || !u.jamiSavol) return;
    const foiz = Math.round((u.togriSoni / u.jamiSavol) * 100);
    if (!(u.mavzuId in engYuqoriFoizlar) || foiz > engYuqoriFoizlar[u.mavzuId]) {
      engYuqoriFoizlar[u.mavzuId] = foiz;
    }
  });

  const mavzular = mavzuSnap.docs.map((d) => ({
    id: d.id,
    nomi: d.data().nomi,
    tartib: d.data().tartib,
    engYuqoriFoiz: engYuqoriFoizlar[d.id] ?? null,
  }));

  // "Umumiy ball" (Akkount sahifasi uchun) — Reyting bilan bir xil qoida:
  // har mavzudan faqat eng yuqori natija, davrsiz (0-QISM 6.4-band).
  const umumiyBallMap = davrBoyichaBalllar(
    urinishSnap.docs.map((d) => d.data()),
    davrOraligi("umumiy")
  );
  const umumiyBall = umumiyBallMap.get(studentUid) || 0;

  const { qolganJon, jamiJon, bonus } = jonHolati;
  return NextResponse.json({ mavzular, qolganJon, jamiJon, bonus, umumiyBall });
}
