// app/api/admin/savollar/route.js
// GET ?mavzuId=xxx: shu mavzuga tegishli savollar ro'yxati.
// POST: yangi savol qo'shadi (0-QISM 7-PROMPT, 1-band) — matn, 4 ta
// variant, to'g'ri javob indeksi (0-3).

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

export async function GET(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const mavzuId = new URL(request.url).searchParams.get("mavzuId");
  if (!mavzuId) {
    return NextResponse.json({ error: "mavzuId ko'rsatilmagan" }, { status: 400 });
  }

  const snap = await adminDb.collection("savollar").where("mavzuId", "==", mavzuId).get();
  const savollar = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ savollar });
}

export async function POST(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  const mavzuId = body?.mavzuId;
  if (!mavzuId || typeof mavzuId !== "string") {
    return NextResponse.json({ error: "mavzuId ko'rsatilmagan" }, { status: 400 });
  }

  const natija = savolniTekshir(body);
  if (natija.error) {
    return NextResponse.json({ error: natija.error }, { status: 400 });
  }

  const ref = await adminDb.collection("savollar").add({ mavzuId, ...natija });
  return NextResponse.json({ id: ref.id, mavzuId, ...natija });
}
