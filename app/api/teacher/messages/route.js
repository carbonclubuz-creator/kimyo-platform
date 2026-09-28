// app/api/teacher/messages/route.js
// GET: ustozning Xabarlar (inbox) ro'yxati — oxirgi kelgani birinchi
// (0-QISM 7-band). Xabarlar faqat "kutilayotgan" holatda saqlanadi
// (qabul/rad/bajarildi bo'lganda o'chiriladi), shuning uchun ro'yxat
// uzunligi = qizil belgidagi son.
//
// Composite index shart bo'lmasligi uchun faqat teacherId bo'yicha
// so'raymiz, tartiblashni xotirada bajaramiz (loyihadagi mavjud naqsh).

import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const snap = await adminDb.collection("messages").where("teacherId", "==", teacherUid).get();

  const xabarlar = snap.docs
    .map((d) => {
      const m = d.data();
      const vaqt = m.createdAt && typeof m.createdAt.toMillis === "function" ? m.createdAt.toMillis() : 0;
      return {
        id: d.id,
        tur: m.tur,
        studentIsm: m.studentIsm || "",
        studentFamiliya: m.studentFamiliya || "",
        classNomi: m.classNomi || "",
        vaqt,
      };
    })
    .sort((a, b) => b.vaqt - a.vaqt);

  const faqatSoni = new URL(request.url).searchParams.get("faqatSoni") === "1";
  if (faqatSoni) {
    return NextResponse.json({ soni: xabarlar.length });
  }
  return NextResponse.json({ soni: xabarlar.length, xabarlar });
}
