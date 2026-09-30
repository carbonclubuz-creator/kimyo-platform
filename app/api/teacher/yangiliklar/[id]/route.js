// app/api/teacher/yangiliklar/[id]/route.js
// PATCH  { matn } — ustoz FAQAT O'Z postining matnini tahrirlaydi (sinflar o'zgarmaydi).
//                   Matn haqiqatan o'zgargan bo'lsagina `tahrirlangan` yoziladi.
// DELETE          — ustoz FAQAT O'Z postini o'chiradi.
// Boshqa ustozning (yoki adminning) posti — 404 (mavjudligi ham oshkor bo'lmaydi).

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { yangilikMatniniTekshir } from "@/lib/yangilikHelpers";
import { togriId, yangilikJson } from "@/lib/yangilikServer";

export const runtime = "nodejs";

async function ozPosti(id, teacherUid) {
  if (!togriId(id)) return null;
  const ref = adminDb.collection("yangiliklar").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.muallifRoli !== "teacher" || d.muallifId !== teacherUid) return null;
  return { ref, data: d };
}

export async function PATCH(request, { params }) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const post = await ozPosti(params?.id, authResult.teacherUid);
  if (!post) return NextResponse.json({ error: "Yangilik topilmadi" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const t = yangilikMatniniTekshir(body?.matn);
  if (t.error) return NextResponse.json({ error: t.error }, { status: 400 });

  if (t.matn === post.data.matn) {
    return NextResponse.json({ ok: true, yangilik: yangilikJson(params.id, post.data) });
  }
  const yangi = { matn: t.matn, tahrirlangan: Timestamp.now() };
  await post.ref.update(yangi);
  return NextResponse.json({ ok: true, yangilik: yangilikJson(params.id, { ...post.data, ...yangi }) });
}

export async function DELETE(request, { params }) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const post = await ozPosti(params?.id, authResult.teacherUid);
  if (!post) return NextResponse.json({ error: "Yangilik topilmadi" }, { status: 404 });

  await post.ref.delete();
  return NextResponse.json({ ok: true });
}
