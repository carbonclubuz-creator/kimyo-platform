// app/api/admin/bonus/route.js
// GET  — joriy bonus jon holati.
// POST — { faol: true, soni: 1–5, muddat, xabar? } yoqadi yoki { faol: false } o'chiradi.
// `sozlamalar/bonusJon` hujjati faqat shu route orqali yoziladi (Admin SDK);
// client Firestore qoidalari bu kolleksiyani to'liq yopadi. Serverda
// validatsiya: soni butun 1–5, xabar <= 80 belgi, muddat ruxsat etilgan
// qiymatlardan biri (lib/bonusMantiq.js). Kuchga kirish tezkor — o'quvchi
// route'lari har so'rovda shu hujjatni o'qiydi.

import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { BONUS_HUJJAT, bonusniOl } from "@/lib/bonusHelpers";
import { bonusSorovniTekshir, tugashniHisobla } from "@/lib/bonusMantiq";

export const runtime = "nodejs";

function javob(b) {
  return {
    ok: true,
    faol: b.faol,
    soni: b.soni,
    xabar: b.xabar,
    tugash: b.tugash ? b.tugash.toISOString() : null,
  };
}

export async function GET(request) {
  const auth = requireAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json(javob(await bonusniOl()));
}

export async function POST(request) {
  const auth = requireAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const tekshiruv = bonusSorovniTekshir(body);
  if (!tekshiruv.ok) {
    return NextResponse.json({ error: tekshiruv.error }, { status: 400 });
  }

  const ref = adminDb.collection("sozlamalar").doc(BONUS_HUJJAT);

  if (!tekshiruv.faol) {
    await ref.set({ faol: false, soni: 0, xabar: "", tugash: null }, { merge: true });
  } else {
    const tugash = tugashniHisobla(tekshiruv.muddat);
    await ref.set({
      faol: true,
      soni: tekshiruv.soni,
      xabar: tekshiruv.xabar,
      yoqilganVaqt: FieldValue.serverTimestamp(),
      tugash: tugash ? Timestamp.fromDate(tugash) : null,
    });
  }

  return NextResponse.json(javob(await bonusniOl()));
}
