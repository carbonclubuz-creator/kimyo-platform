// app/api/student/join/route.js
// Mustaqil o'quvchining hashteg orqali sinfga qo'shilish so'rovi (0-QISM 6.6-band).
//   GET    — joriy holat: sinfdami / kutilmoqda / rad etilgan.
//   POST   { hashteg, maxfiySoz? } — so'rov yuboradi (ustozning Xabarlariga tushadi).
//   DELETE — so'rovni bekor qiladi (ustozdagi xabar ham to'liq o'chadi).
// Bir vaqtda faqat bitta so'rov bo'ladi: joinRequests hujjatining ID'si =
// o'quvchi UID'si. Qabul qilinganda o'quvchining tarixi/ballari saqlanadi
// (yangi akkount yaratilmaydi) — bu app/api/teacher/messages/[id] da.
//
// Maxfiy so'z: hashteg orqali qo'shilgan o'quvchi keyinchalik parolini tiklash
// so'rovini yubora olishi uchun kerak. Agar o'quvchida u hali yo'q bo'lsa
// (eski akkountlar), so'rov yuborilayotganda majburiy so'raladi.

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudent } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { hashtegniTozala } from "@/lib/hashteg";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { studentUid, studentData } = authResult;

  const joinSnap = await adminDb.collection("joinRequests").doc(studentUid).get();
  const join = joinSnap.exists ? joinSnap.data() : null;

  return NextResponse.json({
    sinfda: Boolean(studentData.classId),
    holati: join ? join.holati : null,
    classNomi: join ? join.classNomi : null,
    maxfiySozKerak: !studentData.maxfiySoz,
  });
}

export async function POST(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { studentUid, studentData } = authResult;

  if (studentData.classId) {
    return NextResponse.json({ error: "Siz allaqachon sinfdasiz" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const hashteg = hashtegniTozala(body?.hashteg);
  if (!hashteg) {
    return NextResponse.json({ error: "Hashteg 6 ta raqamdan iborat bo'lishi kerak" }, { status: 400 });
  }

  const joinRef = adminDb.collection("joinRequests").doc(studentUid);
  const joinSnap = await joinRef.get();
  if (joinSnap.exists && joinSnap.data().holati === "kutilmoqda") {
    return NextResponse.json({ error: "Sizda kutilayotgan so'rov bor" }, { status: 409 });
  }

  const classSnap = await adminDb.collection("classes").where("hashteg", "==", hashteg).limit(1).get();
  if (classSnap.empty) {
    return NextResponse.json({ error: "Bunday hashteg topilmadi" }, { status: 404 });
  }
  const classDoc = classSnap.docs[0];
  const sinf = classDoc.data();

  // Maxfiy so'z (kamida 4 belgi) — yo'q bo'lsa majburiy.
  let yangiMaxfiySoz = null;
  if (!studentData.maxfiySoz) {
    yangiMaxfiySoz = String(body?.maxfiySoz ?? "").trim();
    if (!yangiMaxfiySoz) {
      return NextResponse.json({ error: "Maxfiy so'zni kiriting" }, { status: 400 });
    }
    if (yangiMaxfiySoz.length < 4) {
      return NextResponse.json({ error: "Kamida 4 ta belgidan iborat bo'lsin" }, { status: 400 });
    }
  }

  const batch = adminDb.batch();
  if (yangiMaxfiySoz) {
    batch.update(adminDb.collection("users").doc(studentUid), { maxfiySoz: yangiMaxfiySoz });
  }
  batch.set(joinRef, {
    studentId: studentUid,
    classId: classDoc.id,
    classNomi: sinf.nomi || "",
    teacherId: sinf.teacherId,
    holati: "kutilmoqda",
    createdAt: FieldValue.serverTimestamp(),
  });
  // Xabar ID'si deterministik — bir o'quvchidan bitta so'rov xabari bo'ladi.
  batch.set(adminDb.collection("messages").doc(`join_${studentUid}`), {
    tur: "sinfga_qoshilish",
    teacherId: sinf.teacherId,
    studentId: studentUid,
    studentIsm: studentData.ism || "",
    studentFamiliya: studentData.familiya || "",
    classId: classDoc.id,
    classNomi: sinf.nomi || "",
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return NextResponse.json({ ok: true, classNomi: sinf.nomi || "" });
}

export async function DELETE(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { studentUid } = authResult;

  const batch = adminDb.batch();
  batch.delete(adminDb.collection("joinRequests").doc(studentUid));
  batch.delete(adminDb.collection("messages").doc(`join_${studentUid}`));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
