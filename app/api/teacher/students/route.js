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
import { FieldValue } from "firebase-admin/firestore";
import { requireTeacher } from "@/lib/apiAuth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { validateIsmFamiliya, generatePassword, loginToAuthEmail } from "@/lib/accountHelpers";

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

  const ismCap = ismCheck.value;
  const familiyaCap = familiyaCheck.value;
  const password = generatePassword();
  const base = `${ismCap}${familiyaCap}`;

  let login = base;
  let userRecord = null;
  const maxAttempts = 25;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    const email = loginToAuthEmail(login);
    try {
      // eslint-disable-next-line no-await-in-loop
      userRecord = await adminAuth.createUser({ email, password });
      break;
    } catch (err) {
      if (err && err.code === "auth/email-already-exists") {
        const suffix = String(Math.floor(Math.random() * 100)).padStart(2, "0");
        login = `${base}${suffix}`;
      } else {
        return NextResponse.json(
          { error: "Akkount yaratishda xatolik yuz berdi" },
          { status: 500 }
        );
      }
    }
  }

  if (!userRecord) {
    return NextResponse.json(
      { error: "Unikal login yaratib bo'lmadi, qayta urinib ko'ring" },
      { status: 500 }
    );
  }

  await adminDb
    .collection("users")
    .doc(userRecord.uid)
    .set({
      uid: userRecord.uid,
      role: "student",
      ism: ismCap,
      familiya: familiyaCap,
      login,
      loginLower: login.toLowerCase(),
      viloyat: teacherData.viloyat || "",
      tuman: teacherData.tuman || "",
      classId,
      // Ustoz jadvalda istalgan payt ko'ra olishi uchun saqlanadi (ko'z
      // ikonkasi bilan yashirin/ko'rsatilgan) — akkountni ustoz o'zi
      // o'quvchisi uchun yaratadi va boshqaradi.
      currentPassword: password,
      umumiyBali: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ uid: userRecord.uid, login, password });
}
