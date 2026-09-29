// app/api/student/test/start/route.js
// POST { mavzuId }: yangi test boshlaydi yoki tugallanmagan urinishni davom
// ettiradi. MUHIM: javobda hech qachon togriJavobIndex yuborilmaydi — faqat
// savol matni va aralashtirilgan variant matnlari (lib/testEngine.js).
//
// - Tugallanmagan ("jarayonda") urinish bo'lsa: uni qaytaradi, jon olinmaydi.
// - Aks holda: jon 0 bo'lsa { ok:false, reason:"no-hearts" }, savollar
//   bo'lmasa { ok:false, reason:"empty" } qaytariladi.
// - Yangi boshlashda: urinish hujjati, `faolUrinishlar` ko'rsatkichi va jon
//   kamayishi BITTA Firestore transaksiyasida yoziladi (poyga holatidan
//   himoya: React Strict Mode yoki ikki marta bosishda 2 urinish/2 jon
//   bo'lmaydi).

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudent } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { jonHujjatId, jonSanasi } from "@/lib/heartsHelpers";
import { aralashtir, qolganJonniOl, xavfsizSavollarRoyxati } from "@/lib/testEngine";

export const runtime = "nodejs";

export async function POST(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { studentUid } = authResult;

  const body = await request.json().catch(() => null);
  const mavzuId = body?.mavzuId;
  if (!mavzuId || typeof mavzuId !== "string") {
    return NextResponse.json({ error: "mavzuId ko'rsatilmagan" }, { status: 400 });
  }

  // --- Tranzaksiyadan TASHQARIDA tayyorlanadigan narsalar ---
  // Jon va savollar shu yerda o'qiladi (tranzaksiyani yengil ushlash uchun).
  // Jon tekshiruvi esa faqat "yangi" yo'lda qo'llanadi: aks holda jon 0 bo'lib
  // qolgan o'quvchi (oxirgi jonini shu testga sarflagan) davom ettira olmasdi.
  const qolganJon = await qolganJonniOl(studentUid);

  const savollarSnap = await adminDb.collection("savollar").where("mavzuId", "==", mavzuId).get();
  const mavzuSavollari = {};
  savollarSnap.docs.forEach((d) => {
    mavzuSavollari[d.id] = d.data();
  });
  const savolTartibi = aralashtir(Object.keys(mavzuSavollari));
  const variantTartiblari = {};
  savolTartibi.forEach((id) => {
    variantTartiblari[id] = aralashtir([0, 1, 2, 3]);
  });

  const sana = jonSanasi();
  const faolRef = adminDb.collection("faolUrinishlar").doc(`${studentUid}_${mavzuId}`);
  const jonRef = adminDb.collection("jonlar").doc(jonHujjatId(studentUid, sana));
  // ID tranzaksiyadan tashqarida olinadi — tranzaksiya qayta urinsa ham bir xil qoladi.
  const yangiUrinishRef = adminDb.collection("urinishlar").doc();

  // --- ATOMIK QISM ---
  const natija = await adminDb.runTransaction(async (tx) => {
    // Firestore qoidasi: barcha o'qishlar yozishlardan OLDIN.
    const faolSnap = await tx.get(faolRef);
    let mavjudUrinishSnap = null;
    if (faolSnap.exists && faolSnap.data().urinishId) {
      mavjudUrinishSnap = await tx.get(
        adminDb.collection("urinishlar").doc(faolSnap.data().urinishId)
      );
    }

    if (mavjudUrinishSnap && mavjudUrinishSnap.exists) {
      const u = mavjudUrinishSnap.data();
      if (u.studentId === studentUid && u.holati === "jarayonda") {
        return { turi: "resume", urinishId: mavjudUrinishSnap.id, urinish: u };
      }
    }
    // Ko'rsatkich yo'q yoki eskirgan (urinish tugagan/o'chgan) — yangi yaratamiz.

    if (qolganJon <= 0) return { turi: "no-hearts" };
    if (savolTartibi.length === 0) return { turi: "empty" };

    tx.set(yangiUrinishRef, {
      studentId: studentUid,
      mavzuId,
      boshlanganVaqt: FieldValue.serverTimestamp(),
      holati: "jarayonda",
      togriSoni: 0,
      jamiSavol: savolTartibi.length,
      javoblar: [],
      savolTartibi,
      variantTartiblari,
    });
    tx.set(faolRef, { urinishId: yangiUrinishRef.id });
    tx.set(
      jonRef,
      { studentId: studentUid, sana, ishlatilgan: FieldValue.increment(1) },
      { merge: true }
    );
    return { turi: "yangi" };
  });

  if (natija.turi === "no-hearts") {
    return NextResponse.json({ ok: false, reason: "no-hearts" });
  }
  if (natija.turi === "empty") {
    return NextResponse.json({ ok: false, reason: "empty" });
  }

  if (natija.turi === "resume") {
    const urinish = natija.urinish;
    const savolIds = urinish.savolTartibi || [];
    const savollarDocs = await Promise.all(
      savolIds.map((id) => adminDb.collection("savollar").doc(id).get())
    );
    const savollarMap = {};
    savollarDocs.forEach((d) => {
      if (d.exists) savollarMap[d.id] = d.data();
    });

    return NextResponse.json({
      ok: true,
      resumed: true,
      urinishId: natija.urinishId,
      savollar: xavfsizSavollarRoyxati(savolIds, urinish.variantTartiblari, savollarMap),
      joriyIndex: (urinish.javoblar || []).length,
      togriSoni: urinish.togriSoni || 0,
      jamiSavol: urinish.jamiSavol || savolIds.length,
    });
  }

  // natija.turi === "yangi"
  return NextResponse.json({
    ok: true,
    resumed: false,
    urinishId: yangiUrinishRef.id,
    savollar: xavfsizSavollarRoyxati(savolTartibi, variantTartiblari, mavzuSavollari),
    joriyIndex: 0,
    togriSoni: 0,
    jamiSavol: savolTartibi.length,
  });
}
