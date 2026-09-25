// app/api/admin/savollar/[id]/route.js
// PATCH: mavjud savolni tahrirlaydi. DELETE: savolni o'chiradi
// (0-QISM 7-PROMPT, 2-band — "tahrirlash/o'chirish tugmalari bilan").

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function savolniTekshir(body) {
  const matn = (body?.matn || "").trim();
  const variantlar = Array.isArray(body?.variantlar) ? body.variantlar.map((v) => (v || "").trim()) : [];
  const togriJavobIndex = Number(body?.togriJavobIndex);

  if (!matn) return { error: "Savol matni kiritilmagan" };
  if (variantlar.length !== 4 || variantlar.some((v) => !v)) {
    return { error: "4 ta javob varianti to'liq kiritilishi kerak" };
  }
  if (![0, 1, 2, 3].includes(togriJavobIndex)) {
    return { error: "To'g'ri javob belgilanmagan" };
  }

  return { matn, variantlar, togriJavobIndex };
}

export async function PATCH(request, { params }) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  const natija = savolniTekshir(body);
  if (natija.error) {
    return NextResponse.json({ error: natija.error }, { status: 400 });
  }

  const ref = adminDb.collection("savollar").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Savol topilmadi" }, { status: 404 });
  }

  await ref.update(natija);
  return NextResponse.json({ id: params.id, mavzuId: snap.data().mavzuId, ...natija });
}

export async function DELETE(request, { params }) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  await adminDb.collection("savollar").doc(params.id).delete();
  return NextResponse.json({ ok: true });
}
