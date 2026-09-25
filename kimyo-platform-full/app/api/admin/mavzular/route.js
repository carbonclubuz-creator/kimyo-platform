// app/api/admin/mavzular/route.js
// GET: barcha mavzularni tartib bo'yicha qaytaradi.
// POST: yangi mavzu yaratadi (0-QISM 7-PROMPT, 1-band) — faqat nom
// kiritiladi, tartib avtomatik (mavjudlar orasidan eng kattasi + 1).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const snap = await adminDb.collection("mavzular").orderBy("tartib").get();
  const mavzular = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ mavzular });
}

export async function POST(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  const nomi = (body?.nomi || "").trim();
  if (!nomi) {
    return NextResponse.json({ error: "Mavzu nomi kiritilmagan" }, { status: 400 });
  }

  const mavjudlar = await adminDb.collection("mavzular").get();
  let maxTartib = 0;
  mavjudlar.forEach((d) => {
    const t = d.data().tartib;
    if (typeof t === "number" && t > maxTartib) maxTartib = t;
  });

  const ref = await adminDb.collection("mavzular").add({ nomi, tartib: maxTartib + 1 });
  return NextResponse.json({ id: ref.id, nomi, tartib: maxTartib + 1 });
}
