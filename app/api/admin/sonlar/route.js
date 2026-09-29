// app/api/admin/sonlar/route.js
// GET: admin yuqori panelidagi qizil belgilar uchun ikkita son:
//   - parolSorovlari: kutilayotgan parol tiklash so'rovlari,
//   - ustozXabarlari: hali javob berilmagan ustoz xabarlari.
// Hujjatlarni o'qimaydi, count() agregatsiyasi ishlatadi (1000 tagacha 1 ta o'qish).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const [sorovlar, xabarlar] = await Promise.all([
    adminDb.collection("parolSorovlari").count().get(),
    adminDb.collection("ustozXabarlari").where("javobBerilgan", "==", false).count().get(),
  ]);

  return NextResponse.json({
    parolSorovlari: sorovlar.data().count,
    ustozXabarlari: xabarlar.data().count,
  });
}
