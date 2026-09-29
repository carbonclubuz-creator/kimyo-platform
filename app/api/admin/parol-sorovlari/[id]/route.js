// app/api/admin/parol-sorovlari/[id]/route.js
// DELETE: admin parolni yetkazgach ("Bajarildi") so'rovni ro'yxatdan olib tashlaydi.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const id = params?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "So'rov ko'rsatilmagan" }, { status: 400 });
  }

  // Yo'q hujjatni o'chirish xato emas — takroriy bosishda ham "ok".
  await adminDb.collection("parolSorovlari").doc(id).delete();
  return NextResponse.json({ ok: true });
}
