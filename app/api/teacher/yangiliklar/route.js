// app/api/teacher/yangiliklar/route.js
// GET  ?kursor=...  — ustozning O'Z postlari, eng yangisi birinchi, 20 tadan.
//                     Birinchi sahifada (kursorsiz) ustozning hozirgi sinflari ham (`sinflar`) qaytadi.
// POST { matn, sinf } — yangi post. sinf: "hammasi" (ustozning hozirgi barcha sinflari)
//                     yoki bitta sinf ID'si. Sinf egaligini SERVER tekshiradi.
//
// Kerakli composite indeks: yangiliklar — muallifId (O'sish) + yaratilgan (Kamayish).

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { YANGILIK_SAHIFA_HAJMI, yangilikMatniniTekshir } from "@/lib/yangilikHelpers";
import {
  kursorOqish,
  kursorYasash,
  sinflarniTanla,
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
    .where("muallifId", "==", teacherUid)
    .orderBy("yaratilgan", "desc");
  if (kursor) q = q.startAfter(kursor);

  const [snap, sinflar] = await Promise.all([
    q.limit(YANGILIK_SAHIFA_HAJMI + 1).get(),
    kursor ? Promise.resolve(null) : ustozSinflari(teacherUid),
  ]);
  const sahifa = snap.docs.slice(0, YANGILIK_SAHIFA_HAJMI);
  const yanaBor = snap.size > YANGILIK_SAHIFA_HAJMI;

  const javob = {
    yangiliklar: sahifa.map((d) => yangilikJson(d.id, d.data())),
    keyingiKursor: yanaBor ? kursorYasash(sahifa[sahifa.length - 1].get("yaratilgan")) : null,
  };
  if (sinflar) javob.sinflar = sinflar;
  return NextResponse.json(javob);
}

export async function POST(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const body = await request.json().catch(() => null);
  const t = yangilikMatniniTekshir(body?.matn);
  if (t.error) return NextResponse.json({ error: t.error }, { status: 400 });

  const sinf = body?.sinf;
  if (typeof sinf !== "string" || !sinf) {
    return NextResponse.json({ error: "Sinfni tanlang" }, { status: 400 });
  }
  const tanlov = await sinflarniTanla(
    teacherUid,
    sinf === "hammasi" ? { hammasi: true } : { classIds: [sinf] }
  );
  if (tanlov.error) return NextResponse.json({ error: tanlov.error }, { status: tanlov.status });

  const ref = adminDb.collection("yangiliklar").doc();
  const doc = {
    matn: t.matn,
    muallifId: teacherUid,
    muallifRoli: "teacher",
    yaratilgan: Timestamp.now(),
    tahrirlangan: null,
    classIds: tanlov.ids,
  };
  await ref.set(doc);

  return NextResponse.json({ ok: true, yangilik: yangilikJson(ref.id, doc) });
}
