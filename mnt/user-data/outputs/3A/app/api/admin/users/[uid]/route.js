// app/api/admin/users/[uid]/route.js
// DELETE: admin ustozni yoki mustaqil o'quvchini (classId == null) o'chiradi.
// Sinfdagi o'quvchini bu yerdan o'chirib bo'lmaydi — u ustozining o'quvchisi.
//
// USTOZ o'chirilganda:
//   - uning sinflaridagi o'quvchilar "sinfdan chiqarilgan" holatga o'tadi
//     (classId -> null; akkount, ball va parol saqlanadi — ustoz sinfdan
//     chiqargandagi bilan aynan bir xil, app/teacher/class/[id]/page.js),
//   - sinflari, ustozga kelgan xabarlar, sinfga qo'shilish so'rovlari va
//     adminga yozgan xabarlari, yangilik postlari va yuborishlari o'chadi, Auth akkount va login bo'shaydi.
// MUSTAQIL O'QUVCHI o'chirilganda: urinishlar, jonlar, so'rovlar, Auth akkount
// va login o'chadi.
//
// Tartib: avval Firebase Auth (yo'q bo'lsa xato emas), oxirida `users` hujjati.
// Shunday qilib biror qadam yarim yo'lda to'xtasa, admin "O'chirish"ni qayta
// bossa hammasi davom etadi (har qadam takrorlanishga chidamli).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { ustozYangiliklariniOchirRefs } from "@/lib/yangilikServer";

export const runtime = "nodejs";

const BATCH_HAJMI = 400; // Firestore chegarasi 500 ta amal
const IN_HAJMI = 30; // `in` operatori chegarasi

function bolaklarga(royxat, hajm) {
  const natija = [];
  for (let i = 0; i < royxat.length; i += hajm) natija.push(royxat.slice(i, i + hajm));
  return natija;
}

async function refniOchir(refs) {
  for (const bolak of bolaklarga(refs, BATCH_HAJMI)) {
    const batch = adminDb.batch();
    bolak.forEach((r) => batch.delete(r));
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }
}

async function authniOchir(uid) {
  try {
    await adminAuth.deleteUser(uid);
  } catch (err) {
    if (!(err && err.code === "auth/user-not-found")) throw err;
  }
}

async function ustozniOchir(uid, data) {
  const sinflarSnap = await adminDb.collection("classes").where("teacherId", "==", uid).get();
  const sinfIds = sinflarSnap.docs.map((d) => d.id);

  // 1) Sinfdagi o'quvchilarni sinfsiz qoldiramiz (mustaqil o'quvchi holatiga).
  let ozodQilingan = 0;
  for (const idlar of bolaklarga(sinfIds, IN_HAJMI)) {
    // eslint-disable-next-line no-await-in-loop
    const oquvchilar = await adminDb.collection("users").where("classId", "in", idlar).get();
    for (const bolak of bolaklarga(oquvchilar.docs, BATCH_HAJMI)) {
      const batch = adminDb.batch();
      bolak.forEach((d) => batch.update(d.ref, { classId: null }));
      // eslint-disable-next-line no-await-in-loop
      await batch.commit();
    }
    ozodQilingan += oquvchilar.size;
  }

  // 2) Ustozga bog'liq hujjatlar: xabarlar (inbox), sinfga qo'shilish so'rovlari,
  //    adminga yozgan xabarlari, sinflarning o'zi.
  const [xabarlar, sorovlar, adminXabarlari, yangilikRefs] = await Promise.all([
    adminDb.collection("messages").where("teacherId", "==", uid).get(),
    adminDb.collection("joinRequests").where("teacherId", "==", uid).get(),
    adminDb.collection("ustozXabarlari").where("teacherId", "==", uid).get(),
    // Ustozning yangilik postlari va adminning postini sinflariga yuborish havolalari.
    ustozYangiliklariniOchirRefs(uid),
  ]);
  await refniOchir([
    ...xabarlar.docs.map((d) => d.ref),
    ...sorovlar.docs.map((d) => d.ref),
    ...adminXabarlari.docs.map((d) => d.ref),
    ...yangilikRefs,
    ...sinflarSnap.docs.map((d) => d.ref),
  ]);

  // 3) Auth akkount, keyin login band qaydi va users hujjati.
  await authniOchir(uid);
  const refs = [adminDb.collection("users").doc(uid)];
  if (data.loginLower) refs.push(adminDb.collection("loginlar").doc(data.loginLower));
  await refniOchir(refs);

  return { sinflarSoni: sinfIds.length, ozodQilingan };
}

async function oquvchiniOchir(uid, data) {
  const [urinishlar, jonlar, xabarlar] = await Promise.all([
    adminDb.collection("urinishlar").where("studentId", "==", uid).get(),
    adminDb.collection("jonlar").where("studentId", "==", uid).get(),
    adminDb.collection("messages").where("studentId", "==", uid).get(),
  ]);

  // faolUrinishlar hujjati ID'si `${uid}_${mavzuId}` — mavzular urinishlardan olinadi.
  const mavzuIds = new Set(urinishlar.docs.map((d) => d.data().mavzuId).filter(Boolean));
  const faolRefs = [...mavzuIds].map((m) => adminDb.collection("faolUrinishlar").doc(`${uid}_${m}`));

  await authniOchir(uid);
  await refniOchir([
    ...urinishlar.docs.map((d) => d.ref),
    ...jonlar.docs.map((d) => d.ref),
    ...xabarlar.docs.map((d) => d.ref),
    ...faolRefs,
    adminDb.collection("joinRequests").doc(uid),
  ]);

  const refs = [adminDb.collection("users").doc(uid)];
  if (data.loginLower) refs.push(adminDb.collection("loginlar").doc(data.loginLower));
  await refniOchir(refs);

  return { urinishlarSoni: urinishlar.size };
}

export async function DELETE(request, { params }) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const uid = params?.uid;
  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ error: "Foydalanuvchi ko'rsatilmagan" }, { status: 400 });
  }

  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
  }
  const data = snap.data();

  try {
    if (data.role === "teacher") {
      const natija = await ustozniOchir(uid, data);
      return NextResponse.json({ ok: true, role: "teacher", ...natija });
    }
    if (data.role === "student" && !data.classId) {
      const natija = await oquvchiniOchir(uid, data);
      return NextResponse.json({ ok: true, role: "student", ...natija });
    }
  } catch (err) {
    console.error("Foydalanuvchini o'chirish xatosi:", uid, err);
    return NextResponse.json(
      { error: "O'chirishda xatolik yuz berdi. Qayta urinib ko'ring." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: "Sinfdagi o'quvchini bu yerdan o'chirib bo'lmaydi (uni ustozi boshqaradi)" },
    { status: 403 }
  );
}
