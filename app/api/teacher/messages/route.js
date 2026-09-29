// app/api/teacher/messages/route.js
// GET: ustozning Xabarlar (inbox) ro'yxati — oxirgi kelgani birinchi
// (0-QISM 7-band). Uch tur xabar bor:
//   - sinfga_qoshilish, parol_tiklash: faqat "kutilayotgan" holatda saqlanadi
//     (qabul/rad/bajarildi bo'lganda o'chiriladi);
//   - admin_javob: adminning javobi. O'zi o'chib ketmaydi — ustoz xohlasa o'zi
//     o'chiradi (DELETE /api/teacher/messages/[id]).
// Qizil belgidagi son = amal kutayotgan so'rovlar + hali ochilmagan admin
// javoblari (ochilgan admin javobi belgini yoqib turmaydi, lekin ro'yxatda qoladi).
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

  const messages = adminDb.collection("messages");

  // Qizil belgi uchun faqat SON kerak — hujjatlarni o'qimaymiz (belgi tez-tez so'raladi
  // va admin javoblari o'chirilmagani uchun ro'yxat vaqt o'tib o'sadi). Son =
  // amal kutayotgan so'rovlar (admin_javobdan boshqa hammasi) + hali ochilmagan admin javoblari.
  // Faqat tenglik shartlari, shuning uchun yangi indeks shart emas.
  const faqatSoni = new URL(request.url).searchParams.get("faqatSoni") === "1";
  if (faqatSoni) {
    const asos = messages.where("teacherId", "==", teacherUid);
    const adminJavoblar = asos.where("tur", "==", "admin_javob");
    const [jami, adminJami, adminOqilmagan] = await Promise.all([
      asos.count().get(),
      adminJavoblar.count().get(),
      adminJavoblar.where("oqilgan", "==", false).count().get(),
    ]);
    const soni = jami.data().count - adminJami.data().count + adminOqilmagan.data().count;
    return NextResponse.json({ soni });
  }

  const snap = await messages.where("teacherId", "==", teacherUid).get();

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
        // Faqat admin_javob uchun:
        matn: m.matn || "",
        asliMatn: m.asliMatn || "",
        oqilgan: m.tur === "admin_javob" ? Boolean(m.oqilgan) : true,
        vaqt,
      };
    })
    .sort((a, b) => b.vaqt - a.vaqt);

  // Ro'yxat ochildi: o'qilmagan admin javoblari "o'qilgan" deb belgilanadi
  // (javobda esa hali `oqilgan: false` — sahifa ularni "Yangi" deb ajratib ko'rsatadi).
  const oqilmaganlar = snap.docs.filter(
    (d) => d.data().tur === "admin_javob" && !d.data().oqilgan
  );
  if (oqilmaganlar.length > 0) {
    const batch = adminDb.batch();
    oqilmaganlar.forEach((d) => batch.update(d.ref, { oqilgan: true }));
    await batch.commit();
  }

  // Belgi soni endi faqat amal kutayotgan so'rovlar (admin javoblari hozir o'qilgan bo'ldi).
  const soni = xabarlar.filter((x) => x.tur !== "admin_javob").length;
  return NextResponse.json({ soni, xabarlar });
}
