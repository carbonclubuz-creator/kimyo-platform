// app/api/teacher/admin-xabar/route.js
// POST { matn } — ustoz adminga xabar yuboradi (Akkount > "Adminga xabar yuborish").
// Xabar `ustozXabarlari` kolleksiyasiga tushadi va adminning "Ustozdan xabar"
// bo'limida ko'rinadi. Admin javobi ustozning Xabarlar (inbox) qismiga keladi.
// Spamdan himoya: matn <= 1000 belgi, javobsiz xabarlar 10 tadan oshmasin.

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const MAX_UZUNLIK = 1000;
const MAX_JAVOBSIZ = 10;

export async function POST(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid, teacherData } = authResult;

  const body = await request.json().catch(() => null);
  const matn = String(body?.matn ?? "").trim();
  if (!matn) {
    return NextResponse.json({ error: "Xabar matnini yozing" }, { status: 400 });
  }
  if (matn.length > MAX_UZUNLIK) {
    return NextResponse.json(
      { error: `Xabar ${MAX_UZUNLIK} belgidan oshmasligi kerak` },
      { status: 400 }
    );
  }

  const javobsiz = await adminDb
    .collection("ustozXabarlari")
    .where("teacherId", "==", teacherUid)
    .where("javobBerilgan", "==", false)
    .count()
    .get();
  if (javobsiz.data().count >= MAX_JAVOBSIZ) {
    return NextResponse.json(
      { error: "Javob berilmagan xabarlaringiz ko'p. Admin javobini kuting." },
      { status: 429 }
    );
  }

  await adminDb.collection("ustozXabarlari").add({
    teacherId: teacherUid,
    teacherIsm: teacherData.ism || "",
    teacherFamiliya: teacherData.familiya || "",
    teacherLogin: teacherData.login || "",
    matn,
    javobBerilgan: false,
    javoblar: [],
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
