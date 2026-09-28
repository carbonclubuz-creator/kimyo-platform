// app/api/admin/savollar/fayl/route.js
// POST { mavzuNomi, savollar: [{matn, variantlar:[4], togriJavobIndex}] }
// Admin panelida (Excel orqali) allaqachon tekshirilgan savollarni bitta
// mavzu ostida "publish" qiladi:
//   - Shu nomli mavzu mavjud bo'lsa — uning ESKI savollari butunlay
//     o'chirilib, yangilari yoziladi (to'liq almashtirish).
//   - Mavjud bo'lmasa — yangi mavzu avtomatik yaratiladi.
// Diqqat: client (brauzerdagi) tekshiruvi faqat tezkor fikr-mulohaza uchun —
// haqiqiy validatsiya bu yerda, serverda qayta bajariladi.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const BATCH_HAJMI = 400; // Firestore batch cheklovi (500) dan xavfsiz pastda

function savolniTekshir(s) {
  const matn = (s?.matn || "").trim();
  const variantlar = Array.isArray(s?.variantlar) ? s.variantlar.map((v) => (v || "").trim()) : [];
  const togriJavobIndex = Number(s?.togriJavobIndex);
  if (!matn) return null;
  if (variantlar.length !== 4 || variantlar.some((v) => !v)) return null;
  if (![0, 1, 2, 3].includes(togriJavobIndex)) return null;
  return { matn, variantlar, togriJavobIndex };
}

export async function POST(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  const mavzuNomi = (body?.mavzuNomi || "").trim();
  if (!mavzuNomi) {
    return NextResponse.json({ error: "Mavzu nomi kiritilmagan" }, { status: 400 });
  }

  const xomSavollar = Array.isArray(body?.savollar) ? body.savollar : [];
  const savollar = xomSavollar.map(savolniTekshir).filter(Boolean);
  if (savollar.length === 0) {
    return NextResponse.json({ error: "Yaroqli savollar topilmadi" }, { status: 400 });
  }
  if (savollar.length !== xomSavollar.length) {
    return NextResponse.json({ error: "Ba'zi savollar noto'g'ri formatda" }, { status: 400 });
  }

  const mavzuSnap = await adminDb.collection("mavzular").where("nomi", "==", mavzuNomi).limit(1).get();

  let mavzuId;
  if (!mavzuSnap.empty) {
    mavzuId = mavzuSnap.docs[0].id;

    // Eski savollarni butunlay o'chiramiz (to'liq almashtirish qoidasi).
    const eskiSnap = await adminDb.collection("savollar").where("mavzuId", "==", mavzuId).get();
    for (let i = 0; i < eskiSnap.docs.length; i += BATCH_HAJMI) {
      const batch = adminDb.batch();
      eskiSnap.docs.slice(i, i + BATCH_HAJMI).forEach((d) => batch.delete(d.ref));
      // eslint-disable-next-line no-await-in-loop
      await batch.commit();
    }
  } else {
    const mavjudlar = await adminDb.collection("mavzular").get();
    let maxTartib = 0;
    mavjudlar.forEach((d) => {
      const t = d.data().tartib;
      if (typeof t === "number" && t > maxTartib) maxTartib = t;
    });
    const yangiMavzuRef = await adminDb
      .collection("mavzular")
      .add({ nomi: mavzuNomi, tartib: maxTartib + 1 });
    mavzuId = yangiMavzuRef.id;
  }

  for (let i = 0; i < savollar.length; i += BATCH_HAJMI) {
    const batch = adminDb.batch();
    savollar.slice(i, i + BATCH_HAJMI).forEach((s) => {
      const ref = adminDb.collection("savollar").doc();
      batch.set(ref, { mavzuId, ...s });
    });
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }

  return NextResponse.json({ ok: true, mavzuId, mavzuNomi, soni: savollar.length });
}
