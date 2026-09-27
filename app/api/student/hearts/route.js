// app/api/student/hearts/route.js
// GET: faqat qolgan jonlar sonini qaytaradi — StudentHeader har sahifada
// buni chaqiradi (yengil, mavzular ro'yxatini qayta yuklamaydi).

import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/apiAuth";
import { qolganJonniOl } from "@/lib/testEngine";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const qolganJon = await qolganJonniOl(authResult.studentUid);
  return NextResponse.json({ qolganJon });
}
