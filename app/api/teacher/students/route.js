// app/api/teacher/students/route.js
// POST: ustoz o'z sinfiga bitta o'quvchi qo'shadi.
//
// Firebase Admin SDK ishlatiladi — chunki client SDK'dagi
// createUserWithEmailAndPassword yangi akkountga avtomatik "kirib" qo'yadi,
// bu esa ustozning joriy sessiyasini yangi o'quvchi bilan almashtirib
// yuborardi. Login/parol 0-QISM qoidalariga muvofiq generatsiya qilinadi,
// viloyat/tuman ustozdan meros olinadi, parol esa jadvalda ko'rsatish uchun
// Firestore'da saqlanadi (currentPassword — types.ts'ga qarang).

import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { validateIsmFamiliya } from "@/lib/accountHelpers";
import { createStudentAccount } from "@/lib/studentAccount";

export const runtime = "nodejs";

export async function POST(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid, teacherData } = authResult;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const { ism, familiya, classId } = body;

  const ismCheck = validateIsmFamiliya(ism);
  if (!ismCheck.valid) {
    return NextResponse.json({ error: ismCheck.error }, { status: 400 });
  }
  const familiyaCheck = validateIsmFamiliya(familiya);
  if (!familiyaCheck.valid) {
    return NextResponse.json({ error: familiyaCheck.error }, { status: 400 });
  }
  if (!classId || typeof classId !== "string") {
    return NextResponse.json({ error: "Sinf ko'rsatilmagan" }, { status: 400 });
  }

  // Sinf haqiqatan ham shu ustozga tegishli ekanini tekshiramiz — boshqa
  // ustozning sinfiga o'quvchi qo'shib bo'lmasin.
  const classSnap = await adminDb.collection("classes").doc(classId).get();
  if (!classSnap.exists || classSnap.data().teacherId !== teacherUid) {
    return NextResponse.json({ error: "Sinf topilmadi" }, { status: 404 });
  }

  let hisob;
  try {
    hisob = await createStudentAccount({
      ismCap: ismCheck.value,
      familiyaCap: familiyaCheck.value,
      classId,
      teacherData,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.kod ? err.message : "Akkount yaratishda xatolik yuz berdi" },
      { status: 500 }
    );
  }

  return NextResponse.json({ uid: hisob.uid, login: hisob.login, password: hisob.password });
}
