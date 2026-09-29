// app/api/admin/xabarlar/route.js
// GET: ustozlardan adminga kelgan xabarlar (oxirgi kelgani birinchi, ko'pi bilan
// 100 ta). Har xabarda admin avval bergan javoblar ham bor (`javoblar`).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const MAX_XABAR = 100;

function millis(ts) {
  return ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0;
}

export async function GET(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const snap = await adminDb
    .collection("ustozXabarlari")
    .orderBy("createdAt", "desc")
    .limit(MAX_XABAR)
    .get();

  const xabarlar = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      teacherId: x.teacherId,
      teacherIsm: x.teacherIsm || "",
      teacherFamiliya: x.teacherFamiliya || "",
      teacherLogin: x.teacherLogin || "",
      matn: x.matn || "",
      vaqt: millis(x.createdAt),
      javobBerilgan: Boolean(x.javobBerilgan),
      javoblar: (x.javoblar || []).map((j) => ({ matn: j.matn || "", vaqt: millis(j.vaqt) })),
    };
  });

  return NextResponse.json({ xabarlar });
}
