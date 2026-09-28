// app/api/teacher/classes/route.js
// POST  { nomi }     — ustoz yangi sinf yaratadi; sinfga noyob 6 xonali
//                      hashteg avtomatik beriladi (0-QISM 6.6-band).
// PATCH { classId }  — hashtegi hali yo'q (eski) sinfga hashteg beradi;
//                      bor bo'lsa uni o'zgartirmasdan qaytaradi.
// Sinf yaratish endi serverda — hashteg noyobligini faqat server kafolatlay oladi.

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { yangiHashtegYarat } from "@/lib/hashteg";

export const runtime = "nodejs";

export async function POST(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const body = await request.json().catch(() => null);
  const nomi = String(body?.nomi ?? "").trim();
  if (!nomi) {
    return NextResponse.json({ error: "Sinf nomini kiriting" }, { status: 400 });
  }
  if (nomi.length > 60) {
    return NextResponse.json({ error: "Sinf nomi juda uzun" }, { status: 400 });
  }

  const hashteg = await yangiHashtegYarat();
  const ref = await adminDb.collection("classes").add({
    nomi,
    teacherId: teacherUid,
    hashteg,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id, hashteg });
}

export async function PATCH(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const body = await request.json().catch(() => null);
  const classId = body?.classId;
  if (!classId || typeof classId !== "string") {
    return NextResponse.json({ error: "Sinf ko'rsatilmagan" }, { status: 400 });
  }

  const ref = adminDb.collection("classes").doc(classId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().teacherId !== teacherUid) {
    return NextResponse.json({ error: "Sinf topilmadi" }, { status: 404 });
  }

  if (snap.data().hashteg) {
    return NextResponse.json({ hashteg: snap.data().hashteg });
  }

  const hashteg = await yangiHashtegYarat();
  await ref.update({ hashteg });
  return NextResponse.json({ hashteg });
}
