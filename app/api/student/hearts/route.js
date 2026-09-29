// app/api/student/hearts/route.js
// GET: qolgan jonlar, jami jon (5 + bonus) va bonus e'lonini qaytaradi —
// StudentHeader har sahifada buni chaqiradi (yengil, mavzular ro'yxatini
// qayta yuklamaydi).

import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/apiAuth";
import { jonHolatiniOl } from "@/lib/testEngine";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { qolganJon, jamiJon, bonus } = await jonHolatiniOl(authResult.studentUid);
  return NextResponse.json({ qolganJon, jamiJon, bonus });
}
