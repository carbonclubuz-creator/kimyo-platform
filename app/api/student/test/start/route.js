// app/api/student/test/start/route.js
// POST { mavzuId }: yangi test boshlaydi yoki tugallanmagan urinishni davom
// ettiradi. MUHIM: javobda hech qachon togriJavobIndex yuborilmaydi — faqat
// savol matni va aralashtirilgan variant matnlari (lib/testEngine.js).
//
// - Tugallanmagan ("jarayonda") urinish bo'lsa: uni qaytaradi, jon olinmaydi.
// - Aks holda: jon 0 bo'lsa { ok:false, reason:"no-hearts" }, savollar
//   bo'lmasa { ok:false, reason:"empty" } qaytariladi.
// - Yangi boshlashda: savollar va variantlar aralashtiriladi, urinish
//   hujjati yoziladi, 1 jon kamayadi (0-QISM 7-8-band).

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

  // Composite index shart bo'lmasligi uchun faqat studentId bo'yicha
  // so'raymiz, qolganini serverda filtrlaymiz.
  const urinishlarSnap = await adminDb
    .collection("urinishlar")
    .where("studentId", "==", studentUid)
    .get();
  const jarayondaDoc = urinishlarSnap.docs.find((d) => {
    const u = d.data();
    return u.mavzuId === mavzuId && u.holati === "jarayonda";
  });

  if (jarayondaDoc) {
    const urinish = jarayondaDoc.data();
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
      urinishId: jarayondaDoc.id,
      savollar: xavfsizSavollarRoyxati(savolIds, urinish.variantTartiblari, savollarMap),
      joriyIndex: (urinish.javoblar || []).length,
      togriSoni: urinish.togriSoni || 0,
      jamiSavol: urinish.jamiSavol || savolIds.length,
    });
  }

  const qolganJon = await qolganJonniOl(studentUid);
  if (qolganJon <= 0) {
    return NextResponse.json({ ok: false, reason: "no-hearts" });
  }

  const savollarSnap = await adminDb.collection("savollar").where("mavzuId", "==", mavzuId).get();
  if (savollarSnap.empty) {
    return NextResponse.json({ ok: false, reason: "empty" });
  }

  const savollarMap = {};
  savollarSnap.docs.forEach((d) => {
    savollarMap[d.id] = d.data();
  });
  const savolTartibi = aralashtir(Object.keys(savollarMap));
  const variantTartiblari = {};
  savolTartibi.forEach((id) => {
    variantTartiblari[id] = aralashtir([0, 1, 2, 3]);
  });

  const urinishRef = await adminDb.collection("urinishlar").add({
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

  const sana = jonSanasi();
  await adminDb
    .collection("jonlar")
    .doc(jonHujjatId(studentUid, sana))
    .set({ studentId: studentUid, sana, ishlatilgan: FieldValue.increment(1) }, { merge: true });

  return NextResponse.json({
    ok: true,
    resumed: false,
    urinishId: urinishRef.id,
    savollar: xavfsizSavollarRoyxati(savolTartibi, variantTartiblari, savollarMap),
    joriyIndex: 0,
    togriSoni: 0,
    jamiSavol: savolTartibi.length,
  });
}
