// app/api/auth/mustaqil-parol-sorovi/route.js
// POST { ism, familiya, viloyat, rol } — OMMAVIY endpoint (foydalanuvchi parolini
// unutgan, demak tizimga kira olmaydi). Mustaqil o'quvchi (yoki ustoz) ism,
// familiya va viloyatini yuboradi; so'rov `parolSorovlari` kolleksiyasiga
// tushadi va admin panelida (Parol so'rovlari) ko'rinadi. Shaxsni admin
// Telegramda maxfiy so'z orqali tasdiqlaydi — bu endpoint hech narsani
// tasdiqlamaydi va parolga tegmaydi.
//
// Xavfsizlik: javob har doim bir xil ({ ok: true }) — bazada shunday odam bor-yo'qligi
// tashqaridan bilinmaydi.
// Spamdan himoya: so'rov FAQAT bazada shunday foydalanuvchi bor bo'lsagina yoziladi
// (begona odam tasodifiy ismlar bilan ro'yxatni to'ldira olmaydi); bir xil odam
// (rol+ism+familiya+viloyat) uchun bitta hujjat (ID deterministik), va kutilayotgan
// so'rovlar umumiy soni cheklangan. Bazada topilmasa ham foydalanuvchi ekranda nusxa
// matnini ko'radi va adminga Telegramda yoza oladi — admin "Foydalanuvchilar"dan qidiradi.

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { validateIsmFamiliya } from "@/lib/accountHelpers";
import { nomniNormallashtir } from "@/lib/nomTenglashtir";
import { mosFoydalanuvchilar } from "@/lib/parolMoslik";
import { VILOYATLAR } from "@/lib/viloyatlar";

export const runtime = "nodejs";

const MAX_KUTILAYOTGAN = 500;

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const ismCheck = validateIsmFamiliya(body.ism);
  if (!ismCheck.valid) {
    return NextResponse.json({ error: `Ism: ${ismCheck.error}` }, { status: 400 });
  }
  const familiyaCheck = validateIsmFamiliya(body.familiya);
  if (!familiyaCheck.valid) {
    return NextResponse.json({ error: `Familiya: ${familiyaCheck.error}` }, { status: 400 });
  }
  const viloyat = String(body.viloyat ?? "");
  if (!VILOYATLAR.includes(viloyat)) {
    return NextResponse.json({ error: "Viloyatni tanlang" }, { status: 400 });
  }
  const rol = body.rol === "ustoz" ? "ustoz" : "oquvchi";

  try {
    // Bazada shunday foydalanuvchi yo'q — hech narsa yozmaymiz (javob baribir bir xil).
    const mos = await mosFoydalanuvchilar({
      rol,
      ism: ismCheck.value,
      familiya: familiyaCheck.value,
      viloyat,
    });
    if (mos.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const kolleksiya = adminDb.collection("parolSorovlari");

    // Kutilayotgan so'rovlar juda ko'payib ketsa (spam) — yangisini yozmaymiz.
    // count() agregatsiyasi 1000 ta hujjatga 1 ta o'qish hisoblanadi (arzon).
    const jami = (await kolleksiya.count().get()).data().count;
    if (jami >= MAX_KUTILAYOTGAN) {
      return NextResponse.json(
        { error: "So'rovlar hozir juda ko'p. Birozdan keyin qayta urinib ko'ring." },
        { status: 503 }
      );
    }

    const kalit = [rol, nomniNormallashtir(ismCheck.value), nomniNormallashtir(familiyaCheck.value), viloyat].join("|");
    const id = crypto.createHash("sha1").update(kalit).digest("hex").slice(0, 24);

    await kolleksiya.doc(id).set({
      rol,
      ism: ismCheck.value,
      familiya: familiyaCheck.value,
      viloyat,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("mustaqil-parol-sorovi xatosi:", err);
    return NextResponse.json({ error: "Server xatosi. Birozdan keyin qayta urinib ko'ring." }, { status: 500 });
  }
}
