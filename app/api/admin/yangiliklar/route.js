// app/api/admin/yangiliklar/route.js
// GET  ?kursor=...  — adminning o'z postlari, eng yangisi birinchi, 20 tadan.
//                     Javobda `keyingiKursor` (yana bor bo'lsa) — "Yana yuklash" uchun.
// POST { matn, ustozlarga, mustaqilga } — yangi post. Kamida bitta auditoriya
//                     (ustozlarga / mustaqilga) tanlanishi shart.
//
// Kerakli composite indeks: yangiliklar — muallifRoli (O'sish) + yaratilgan (Kamayish).

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { YANGILIK_SAHIFA_HAJMI, yangilikMatniniTekshir } from "@/lib/yangilikHelpers";
import { kursorOqish, kursorYasash, yangilikJson } from "@/lib/yangilikServer";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const kursorParam = new URL(request.url).searchParams.get("kursor");
  let kursor = null;
  if (kursorParam) {
    kursor = kursorOqish(kursorParam);
    if (!kursor) {
      return NextResponse.json({ error: "Kursor noto'g'ri" }, { status: 400 });
    }
  }

  let q = adminDb
    .collection("yangiliklar")
    .where("muallifRoli", "==", "admin")
    .orderBy("yaratilgan", "desc");
  if (kursor) q = q.startAfter(kursor);

  // +1 ta ortiqcha o'qiymiz: shu bilan "yana bor-yo'qligi" ma'lum bo'ladi (count() so'rovi kerak emas).
  const snap = await q.limit(YANGILIK_SAHIFA_HAJMI + 1).get();
  const sahifa = snap.docs.slice(0, YANGILIK_SAHIFA_HAJMI);
  const yanaBor = snap.size > YANGILIK_SAHIFA_HAJMI;

  return NextResponse.json({
    yangiliklar: sahifa.map((d) => yangilikJson(d.id, d.data())),
    keyingiKursor: yanaBor ? kursorYasash(sahifa[sahifa.length - 1].get("yaratilgan")) : null,
  });
}

export async function POST(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  const t = yangilikMatniniTekshir(body?.matn);
  if (t.error) {
    return NextResponse.json({ error: t.error }, { status: 400 });
  }

  const ustozlarga = body?.ustozlarga === true;
  const mustaqilga = body?.mustaqilga === true;
  if (!ustozlarga && !mustaqilga) {
    return NextResponse.json(
      { error: "Kamida bitta auditoriyani tanlang (ustozlar yoki mustaqil o'quvchilar)" },
      { status: 400 }
    );
  }

  // Timestamp.now(): javobda aniq vaqtni qaytarish uchun hujjatni qayta o'qish kerak bo'lmaydi.
  const ref = adminDb.collection("yangiliklar").doc();
  const doc = {
    matn: t.matn,
    muallifId: "admin",
    muallifRoli: "admin",
    yaratilgan: Timestamp.now(),
    tahrirlangan: null,
    ustozlarga,
    mustaqilga,
  };
  await ref.set(doc);

  return NextResponse.json({ ok: true, yangilik: yangilikJson(ref.id, doc) });
}
