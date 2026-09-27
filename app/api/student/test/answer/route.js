// app/api/student/test/answer/route.js
// POST { urinishId, savolIndex, tanlanganDisplayIndex }: bitta savolga
// berilgan javobni serverda tekshiradi. To'g'ri/noto'g'ri va to'g'ri
// javobning EKRANDAGI o'rni faqat SHU javobdan keyin qaytariladi — hech
// qachon oldindan emas.

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudent } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { studentUid } = authResult;

  const body = await request.json().catch(() => null);
  const { urinishId, savolIndex, tanlanganDisplayIndex } = body || {};
  if (
    !urinishId ||
    typeof savolIndex !== "number" ||
    typeof tanlanganDisplayIndex !== "number" ||
    tanlanganDisplayIndex < 0 ||
    tanlanganDisplayIndex > 3
  ) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const urinishRef = adminDb.collection("urinishlar").doc(urinishId);
  const urinishSnap = await urinishRef.get();
  if (!urinishSnap.exists) {
    return NextResponse.json({ error: "Urinish topilmadi" }, { status: 404 });
  }
  const urinish = urinishSnap.data();

  if (urinish.studentId !== studentUid) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
  if (urinish.holati !== "jarayonda") {
    return NextResponse.json({ error: "Bu urinish allaqachon tugallangan" }, { status: 400 });
  }

  const javoblar = urinish.javoblar || [];
  const savolTartibi = urinish.savolTartibi || [];
  // Himoya: faqat "joriy" (navbatdagi) savolga javob berish mumkin —
  // avvalgi savolni qayta javoblash yoki keyingisiga sakrab o'tish yo'q.
  if (savolIndex !== javoblar.length || savolIndex >= savolTartibi.length) {
    return NextResponse.json({ error: "Bu savolga endi javob berib bo'lmaydi" }, { status: 400 });
  }

  const savolId = savolTartibi[savolIndex];
  const savolSnap = await adminDb.collection("savollar").doc(savolId).get();
  if (!savolSnap.exists) {
    return NextResponse.json({ error: "Savol topilmadi" }, { status: 404 });
  }
  const savol = savolSnap.data();
  const tartib = urinish.variantTartiblari[savolId]; // [aslIndeks, aslIndeks, aslIndeks, aslIndeks]

  const aslTanlanganIndeks = tartib[tanlanganDisplayIndex];
  const togrimi = aslTanlanganIndeks === savol.togriJavobIndex;
  const togriDisplayIndex = tartib.indexOf(savol.togriJavobIndex);

  const yangiJavoblar = [...javoblar, aslTanlanganIndeks];
  const yangiTogriSoni = togrimi ? (urinish.togriSoni || 0) + 1 : urinish.togriSoni || 0;
  const oxirgimi = yangiJavoblar.length >= savolTartibi.length;

  const yangilash = {
    javoblar: yangiJavoblar,
    togriSoni: yangiTogriSoni,
  };
  if (oxirgimi) yangilash.holati = "tugallangan";

  await urinishRef.update(yangilash);

  if (oxirgimi) {
    // Test tugadi — shu urinishdagi to'g'ri javoblar soni "umumiy ball"ga
    // qo'shiladi (0-QISM 11-band). Qayta ishlangan testlar ham hisoblanadi.
    await adminDb
      .collection("users")
      .doc(studentUid)
      .update({ umumiyBali: FieldValue.increment(yangiTogriSoni) });
  }

  return NextResponse.json({
    ok: true,
    togrimi,
    togriDisplayIndex,
    oxirgimi,
    togriSoni: yangiTogriSoni,
    jamiSavol: savolTartibi.length,
  });
}
