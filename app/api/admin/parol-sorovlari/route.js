// app/api/admin/parol-sorovlari/route.js
// GET: adminga kelgan parol tiklash so'rovlari (oxirgi kelgani birinchi, ko'pi
// bilan 50 ta) va har bir so'rov uchun bazadan shunga MOS foydalanuvchilar.
//
// Moslik mantiqi lib/parolMoslik.js da (so'rov yozilayotganda ham shu ishlatiladi).
// Bir so'rovga bir nechta mos odam chiqishi mumkin (bir xil ism-familiya) —
// admin ularni maxfiy so'z orqali farqlaydi.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { mosFoydalanuvchilar } from "@/lib/parolMoslik";

export const runtime = "nodejs";

const MAX_SOROV = 50;

export async function GET(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const snap = await adminDb
    .collection("parolSorovlari")
    .orderBy("createdAt", "desc")
    .limit(MAX_SOROV)
    .get();

  const sorovlar = await Promise.all(
    snap.docs.map(async (d) => {
      const s = d.data();
      const vaqt =
        s.createdAt && typeof s.createdAt.toMillis === "function" ? s.createdAt.toMillis() : 0;
      return {
        id: d.id,
        rol: s.rol === "ustoz" ? "ustoz" : "oquvchi",
        ism: s.ism || "",
        familiya: s.familiya || "",
        viloyat: s.viloyat || "",
        vaqt,
        mos: await mosFoydalanuvchilar(s),
      };
    })
  );

  return NextResponse.json({ sorovlar });
}
