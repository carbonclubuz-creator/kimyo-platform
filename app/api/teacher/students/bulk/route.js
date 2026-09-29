// app/api/teacher/students/bulk/route.js
// POST { classId, students: [{ ism, familiya }] }: ustoz o'z sinfiga bir
// nechta o'quvchini bir so'rovda qo'shadi (4-bosqich, "Ko'plab qo'shish").
//
// - Sinf egaligi BIR marta tekshiriladi (boshqa ustoz sinfi -> 404).
// - Bitta so'rovda ko'pi bilan 10 qator (Netlify funksiya vaqt limiti va
//   createUser tezligi uchun); client 100 tagacha qatorni 10 tadan bo'laklab yuboradi.
// - Har qator serverda QAYTA validatsiya qilinadi (clientga ishonilmaydi).
// - Qatorlar kichik parallellik (<=5) bilan yaratiladi; bitta qator xatosi
//   qolganlarni to'xtatmaydi. Bir xil ism-familiya bir so'rovda kelsa ham
//   login to'qnashuvi createStudentAccount'dagi "band bo'lsa raqam qo'sh"
//   tsikli bilan hal bo'ladi (Auth email noyobligini o'zi kafolatlaydi).
// Javob: { ok, natijalar: [{ index, ok, ism?, familiya?, login?, password?, uid?, error? }] }.

import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/apiAuth";
import { validateIsmFamiliya } from "@/lib/accountHelpers";
import { ustozSinfi } from "@/lib/sinfEgaligi";
import { createStudentAccount } from "@/lib/studentAccount";

export const runtime = "nodejs";

const BIR_SOROVDA_MAX = 10;
const PARALLELLIK = 5;

export async function POST(request) {
  const authResult = await requireTeacher(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { teacherUid, teacherData } = authResult;

  const body = await request.json().catch(() => null);
  const classId = body?.classId;
  const qatorlar = body?.students;
  if (!classId || typeof classId !== "string" || !Array.isArray(qatorlar)) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  if (qatorlar.length === 0) {
    return NextResponse.json({ error: "O'quvchilar ro'yxati bo'sh" }, { status: 400 });
  }
  if (qatorlar.length > BIR_SOROVDA_MAX) {
    return NextResponse.json(
      { error: `Bitta so'rovda ko'pi bilan ${BIR_SOROVDA_MAX} ta o'quvchi yuborish mumkin` },
      { status: 400 }
    );
  }

  const sinf = await ustozSinfi(classId, teacherUid);
  if (!sinf) {
    return NextResponse.json({ error: "Sinf topilmadi" }, { status: 404 });
  }

  const natijalar = new Array(qatorlar.length);

  async function birQator(index) {
    const q = qatorlar[index] || {};
    const ism = validateIsmFamiliya(q.ism);
    const fam = validateIsmFamiliya(q.familiya);
    if (!ism.valid || !fam.valid) {
      natijalar[index] = {
        index,
        ok: false,
        error: !ism.valid ? `Ism: ${ism.error}` : `Familiya: ${fam.error}`,
      };
      return;
    }
    try {
      const h = await createStudentAccount({
        ismCap: ism.value,
        familiyaCap: fam.value,
        classId,
        teacherData,
      });
      natijalar[index] = {
        index,
        ok: true,
        uid: h.uid,
        ism: ism.value,
        familiya: fam.value,
        login: h.login,
        password: h.password,
      };
    } catch (err) {
      natijalar[index] = {
        index,
        ok: false,
        error: err.kod ? err.message : "Akkount yaratishda xatolik yuz berdi",
      };
    }
  }

  // Oddiy ishchilar puli: har ishchi navbatdagi indeksni oladi.
  let keyingi = 0;
  async function ishchi() {
    while (keyingi < qatorlar.length) {
      const i = keyingi;
      keyingi += 1;
      // eslint-disable-next-line no-await-in-loop
      await birQator(i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLELLIK, qatorlar.length) }, ishchi));

  return NextResponse.json({ ok: true, natijalar });
}
