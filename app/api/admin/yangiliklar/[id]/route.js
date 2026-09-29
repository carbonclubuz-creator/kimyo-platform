// app/api/admin/yangiliklar/[id]/route.js
// PATCH  { matn } — admin o'z postining matnini tahrirlaydi (faqat matn; auditoriya
//                   yaratilganda belgilanadi va o'zgarmaydi). Matn haqiqatan o'zgargan
//                   bo'lsagina `tahrirlangan` vaqti yoziladi. Ustozlar yuborgan joylarda
//                   ham avtomatik yangilanadi (matn nusxalanmagan).
// DELETE          — postni o'chiradi + uni ko'rsatuvchi `yangilikYuborishlar` havolalarini
//                   ham tozalaydi (o'qishda yo'q hujjat baribir o'tkazib yuboriladi).

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { yangilikMatniniTekshir } from "@/lib/yangilikHelpers";
import { yangilikJson, yangilikYuborishlariniOchir } from "@/lib/yangilikServer";

export const runtime = "nodejs";

async function adminPosti(id) {
  if (!id || typeof id !== "string") return null;
  const ref = adminDb.collection("yangiliklar").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().muallifRoli !== "admin") return null;
  return { ref, data: snap.data() };
}

export async function PATCH(request, { params }) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const post = await adminPosti(params?.id);
  if (!post) {
    return NextResponse.json({ error: "Yangilik topilmadi" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const t = yangilikMatniniTekshir(body?.matn);
  if (t.error) {
    return NextResponse.json({ error: t.error }, { status: 400 });
  }

  // O'zgarish yo'q — "tahrirlangan" belgisi qo'yilmaydi.
  if (t.matn === post.data.matn) {
    return NextResponse.json({ ok: true, yangilik: yangilikJson(params.id, post.data) });
  }

  const yangi = { matn: t.matn, tahrirlangan: Timestamp.now() };
  await post.ref.update(yangi);
  return NextResponse.json({ ok: true, yangilik: yangilikJson(params.id, { ...post.data, ...yangi }) });
}

export async function DELETE(request, { params }) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const post = await adminPosti(params?.id);
  if (!post) {
    return NextResponse.json({ error: "Yangilik topilmadi" }, { status: 404 });
  }

  try {
    // Avval havolalar, keyin original: yarim yo'lda to'xtasa "O'chirish"ni qayta bosish mumkin.
    await yangilikYuborishlariniOchir(params.id);
    await post.ref.delete();
  } catch (err) {
    console.error("Yangilikni o'chirish xatosi:", params.id, err);
    return NextResponse.json({ error: "O'chirishda xatolik yuz berdi. Qayta urinib ko'ring." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
