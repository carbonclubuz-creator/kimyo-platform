// app/api/teacher/yangiliklar/admindan/[id]/route.js
// POST   { hammasi: true } yoki { classIds: [...] } — ustoz admin postini o'z sinflariga
//        yuboradi. MATN NUSXALANMAYDI: faqat `yangilikYuborishlar/{ustozId}_{yangilikId}`
//        hujjati ({ ustozId, yangilikId, classIds, yuborilgan }) yoziladi. Qayta yuborilsa
//        hujjat USTIGA YOZILADI (sinflar ro'yxati va `yuborilgan` vaqti yangilanadi).
//        Sinf egaligini server tekshiradi (faqat ustozning O'Z sinflari).
// DELETE — yuborishni bekor qiladi (hujjatni o'chiradi; o'quvchilar postni ko'rmay qoladi).

import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireTeacher } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { millis, sinflarniTanla, togriId } from "@/lib/yangilikServer";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid } = authResult;

  const id = params?.id;
  if (!togriId(id)) {
    return NextResponse.json({ error: "Yangilik topilmadi" }, { status: 404 });
  }
  const postSnap = await adminDb.collection("yangiliklar").doc(id).get();
  if (!postSnap.exists || postSnap.data().muallifRoli !== "admin" || postSnap.data().ustozlarga !== true) {
    return NextResponse.json({ error: "Yangilik topilmadi" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const tanlov = await sinflarniTanla(teacherUid, {
    hammasi: body?.hammasi === true,
    classIds: body?.classIds,
  });
  if (tanlov.error) return NextResponse.json({ error: tanlov.error }, { status: tanlov.status });

  const doc = {
    ustozId: teacherUid,
    yangilikId: id,
    classIds: tanlov.ids,
    yuborilgan: Timestamp.now(),
  };
  await adminDb.collection("yangilikYuborishlar").doc(`${teacherUid}_${id}`).set(doc);

  return NextResponse.json({ ok: true, yuborilgan: { classIds: doc.classIds, vaqt: millis(doc.yuborilgan) } });
}

export async function DELETE(request, { params }) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const id = params?.id;
  if (!togriId(id)) {
    return NextResponse.json({ error: "Yangilik topilmadi" }, { status: 404 });
  }
  // Hujjat ID'si ustoz UID'sidan boshlanadi — boshqa ustozning yuborishiga tegib bo'lmaydi.
  await adminDb.collection("yangilikYuborishlar").doc(`${authResult.teacherUid}_${id}`).delete();
  return NextResponse.json({ ok: true });
}
