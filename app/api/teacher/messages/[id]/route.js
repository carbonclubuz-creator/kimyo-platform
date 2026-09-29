// app/api/teacher/messages/[id]/route.js
// POST { amal }: ustoz o'z Xabarlar bo'limidagi bitta xabar ustida amal bajaradi.
//   Sinfga qo'shilish so'rovi (tur = "sinfga_qoshilish"):
//     "qabul" — o'quvchi sinfga qo'shiladi (tarixi/ballari saqlanadi),
//     "rad"   — so'rov rad etiladi (o'quvchi "Rad etildi" ko'radi, qayta yubora oladi).
//   Parolni tiklash so'rovi (tur = "parol_tiklash"):
//     "yangilash" — yangi parol yaratiladi va BIR MARTA javobda qaytariladi,
//     "bajarildi" — xabar ro'yxatdan olib tashlanadi.
// Hashteg orqali qo'shilgan o'quvchining parolini ustoz FAQAT shu yerdan, ya'ni
// o'quvchining o'zi so'rov yuborgan holatdagina yangilay oladi (0-QISM 3-band).

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireTeacher } from "@/lib/apiAuth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { generatePassword } from "@/lib/accountHelpers";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const body = await request.json().catch(() => null);
  const amal = body?.amal;

  const msgRef = adminDb.collection("messages").doc(params.id);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists || msgSnap.data().teacherId !== teacherUid) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }
  const msg = msgSnap.data();

  // Admin javobida studentId yo'q — unga Qabul/Rad/Yangilash amali bo'lmaydi
  // (o'chirish uchun DELETE ishlatiladi). Aks holda pastda undefined ID bilan xato chiqardi.
  if (msg.tur !== "sinfga_qoshilish" && msg.tur !== "parol_tiklash") {
    return NextResponse.json({ error: "Bu xabarga amal bajarib bo'lmaydi" }, { status: 400 });
  }

  const studentRef = adminDb.collection("users").doc(msg.studentId);
  const joinRef = adminDb.collection("joinRequests").doc(msg.studentId);

  // ---------- Sinfga qo'shilish so'rovi ----------
  if (msg.tur === "sinfga_qoshilish") {
    if (amal !== "qabul" && amal !== "rad") {
      return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
    }

    const joinSnap = await joinRef.get();
    if (!joinSnap.exists || joinSnap.data().holati !== "kutilmoqda" || joinSnap.data().classId !== msg.classId) {
      // O'quvchi so'rovni bekor qilgan yoki boshqa sinfga yuborgan — eskirgan xabar.
      await msgRef.delete();
      return NextResponse.json({ error: "So'rov bekor qilingan" }, { status: 409 });
    }

    if (amal === "rad") {
      const batch = adminDb.batch();
      batch.update(joinRef, { holati: "rad_etildi" });
      batch.delete(msgRef);
      await batch.commit();
      return NextResponse.json({ ok: true });
    }

    // amal === "qabul"
    const classSnap = await adminDb.collection("classes").doc(msg.classId).get();
    if (!classSnap.exists || classSnap.data().teacherId !== teacherUid) {
      return NextResponse.json({ error: "Sinf topilmadi" }, { status: 404 });
    }
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists || studentSnap.data().role !== "student") {
      await msgRef.delete();
      return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
    }
    if (studentSnap.data().classId) {
      const batchEskirgan = adminDb.batch();
      batchEskirgan.delete(msgRef);
      batchEskirgan.delete(joinRef);
      await batchEskirgan.commit();
      return NextResponse.json({ error: "O'quvchi allaqachon boshqa sinfda" }, { status: 409 });
    }

    const batch = adminDb.batch();
    batch.update(studentRef, {
      classId: msg.classId,
      qoshilishUsuli: "hashteg",
      sinfgaQoshilganVaqt: FieldValue.serverTimestamp(),
    });
    batch.delete(joinRef);
    batch.delete(msgRef);
    await batch.commit();
    return NextResponse.json({ ok: true });
  }

  // ---------- Parolni tiklash so'rovi ----------
  if (msg.tur === "parol_tiklash") {
    if (amal === "bajarildi") {
      await msgRef.delete();
      return NextResponse.json({ ok: true });
    }
    if (amal !== "yangilash") {
      return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
    }

    const studentSnap = await studentRef.get();
    const s = studentSnap.exists ? studentSnap.data() : null;
    if (!s || s.role !== "student" || s.classId !== msg.classId || s.qoshilishUsuli !== "hashteg") {
      // O'quvchi sinfdan chiqarilgan yoki holati o'zgargan — so'rov eskirgan.
      await msgRef.delete();
      return NextResponse.json({ error: "So'rov eskirgan" }, { status: 409 });
    }
    const classSnap = await adminDb.collection("classes").doc(msg.classId).get();
    if (!classSnap.exists || classSnap.data().teacherId !== teacherUid) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const parol = generatePassword();
    await adminAuth.updateUser(msg.studentId, { password: parol });
    // Yangi parol ustozda saqlanmaydi (faqat shu javobda ko'rsatiladi); eski,
    // endi yaroqsiz bo'lib qolgan currentPassword bo'lsa — o'chiramiz.
    await studentRef.update({ currentPassword: FieldValue.delete() });
    return NextResponse.json({ ok: true, parol, login: s.login });
  }

  return NextResponse.json({ error: "Noma'lum xabar turi" }, { status: 400 });
}

/**
 * DELETE: ustoz adminning javobini (tur = "admin_javob") o'z inboxidan o'chiradi.
 * Boshqa turdagi xabarlar (qo'shilish/parol so'rovlari) faqat amal bajarilganda
 * (Qabul/Rad/Bajarildi) o'chadi, shuning uchun bu yerdan o'chirilmaydi.
 */
export async function DELETE(request, { params }) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const msgRef = adminDb.collection("messages").doc(params.id);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists || msgSnap.data().teacherId !== teacherUid) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }
  if (msgSnap.data().tur !== "admin_javob") {
    return NextResponse.json(
      { error: "Bu so'rovni o'chirib bo'lmaydi — unga amal bajaring" },
      { status: 400 }
    );
  }

  await msgRef.delete();
  return NextResponse.json({ ok: true });
}
