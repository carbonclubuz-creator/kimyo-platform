// app/api/teacher/yangiliklar/admindan/route.js
// GET ?kursor=... — admin postlari (ustozlarga: true), eng yangisi birinchi, 20 tadan.
// Har postda shu ustozning yuborish holati: `yuborilgan` = { classIds, vaqt } yoki null
// (yuborishlar `yangilikYuborishlar/{ustozId}_{yangilikId}` dan ID bo'yicha bitta getAll
// bilan olinadi — qo'shimcha so'rov/indeks kerak emas). Birinchi sahifada `sinflar` ham qaytadi.
//
// Kerakli composite indeks: yangiliklar — ustozlarga (O'sish) + yaratilgan (Kamayish).

import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { YANGILIK_SAHIFA_HAJMI } from "@/lib/yangilikHelpers";
import {
  kursorOqish,
  kursorYasash,
  millis,
  ustozSinflari,
  yangilikJson,
} from "@/lib/yangilikServer";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const kursorParam = new URL(request.url).searchParams.get("kursor");
  let kursor = null;
  if (kursorParam) {
    kursor = kursorOqish(kursorParam);
    if (!kursor) return NextResponse.json({ error: "Kursor noto'g'ri" }, { status: 400 });
  }

  let q = adminDb
    .collection("yangiliklar")
    .where("ustozlarga", "==", true)
    .orderBy("yaratilgan", "desc");
  if (kursor) q = q.startAfter(kursor);

  const [snap, sinflar] = await Promise.all([
    q.limit(YANGILIK_SAHIFA_HAJMI + 1).get(),
    kursor ? Promise.resolve(null) : ustozSinflari(teacherUid),
  ]);
  const sahifa = snap.docs.slice(0, YANGILIK_SAHIFA_HAJMI);
  const yanaBor = snap.size > YANGILIK_SAHIFA_HAJMI;

  const yuborishlar = sahifa.length
    ? await adminDb.getAll(
        ...sahifa.map((d) => adminDb.collection("yangilikYuborishlar").doc(`${teacherUid}_${d.id}`))
      )
    : [];

  const yangiliklar = sahifa.map((d, i) => {
    const y = yuborishlar[i];
    return {
      ...yangilikJson(d.id, d.data()),
      yuborilgan: y.exists
        ? { classIds: y.data().classIds || [], vaqt: millis(y.data().yuborilgan) }
        : null,
    };
  });

  const javob = {
    yangiliklar,
    keyingiKursor: yanaBor ? kursorYasash(sahifa[sahifa.length - 1].get("yaratilgan")) : null,
  };
  if (sinflar) javob.sinflar = sinflar;
  return NextResponse.json(javob);
}
