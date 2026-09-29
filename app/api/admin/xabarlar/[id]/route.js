// app/api/admin/xabarlar/[id]/route.js
// POST   { javob } — admin ustoz xabariga javob yozadi. Javob ustozning Xabarlar
//                    (inbox) bo'limiga `messages` hujjati sifatida tushadi
//                    (tur = "admin_javob") va o'zi o'chib ketmaydi — faqat ustoz
//                    xohlasa o'zi o'chiradi. Xabarning o'zi esa "javob berilgan"
//                    deb belgilanadi va javob tarixiga qo'shiladi.
// DELETE           — admin xabarni o'z ro'yxatidan o'chiradi (ustozning inboxiga
//                    allaqachon tushgan javoblarga tegmaydi).

import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const MAX_UZUNLIK = 1000;

export async function POST(request, { params }) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  const javob = String(body?.javob ?? "").trim();
  if (!javob) {
    return NextResponse.json({ error: "Javob matnini yozing" }, { status: 400 });
  }
  if (javob.length > MAX_UZUNLIK) {
    return NextResponse.json(
      { error: `Javob ${MAX_UZUNLIK} belgidan oshmasligi kerak` },
      { status: 400 }
    );
  }

  const ref = adminDb.collection("ustozXabarlari").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }
  const x = snap.data();

  // Ustoz o'chirilgan bo'lsa (uning xabarlari ham o'chgan bo'lishi kerak edi) — javob yuboradigan kimsa yo'q.
  const ustozSnap = await adminDb.collection("users").doc(x.teacherId).get();
  if (!ustozSnap.exists || ustozSnap.data().role !== "teacher") {
    return NextResponse.json({ error: "Ustoz topilmadi" }, { status: 404 });
  }

  const batch = adminDb.batch();
  batch.set(adminDb.collection("messages").doc(), {
    tur: "admin_javob",
    teacherId: x.teacherId,
    matn: javob,
    // Ustozga qaysi xabariga javob ekanini eslatish uchun asl matnning boshi.
    asliMatn: String(x.matn || "").slice(0, 200),
    oqilgan: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(ref, {
    javobBerilgan: true,
    // Massiv ichida serverTimestamp() ishlamaydi — Timestamp.now() ishlatiladi.
    javoblar: FieldValue.arrayUnion({ matn: javob, vaqt: Timestamp.now() }),
  });
  await batch.commit();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  await adminDb.collection("ustozXabarlari").doc(params.id).delete();
  return NextResponse.json({ ok: true });
}
