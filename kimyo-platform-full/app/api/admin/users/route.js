// app/api/admin/users/route.js
// GET: barcha "teacher" va mustaqil ("student" va classId == null)
// foydalanuvchilarni qaytaradi (0-QISM 6-PROMPT, 2-band). Firestore
// qoidalari client'ga bunday keng ro'yxatni o'qishga ruxsat bermaydi —
// shuning uchun Admin SDK orqali, serverda bajariladi.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request) {
  const authResult = requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const [teacherSnap, studentSnap] = await Promise.all([
    adminDb.collection("users").where("role", "==", "teacher").get(),
    adminDb
      .collection("users")
      .where("role", "==", "student")
      .where("classId", "==", null)
      .get(),
  ]);

  const users = [...teacherSnap.docs, ...studentSnap.docs].map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      role: data.role,
      ism: data.ism,
      familiya: data.familiya,
      login: data.login,
      viloyat: data.viloyat,
      tuman: data.tuman,
      maktabMarkaz: data.maktabMarkaz || null,
      // Faqat teacher'da mavjud (0-QISM: "faqat teacher uchun"). Mustaqil
      // o'quvchida bu maydon yo'q — spec bo'shlig'i, pastda izoh qarang.
      maxfiySoz: data.maxfiySoz || null,
    };
  });

  return NextResponse.json({ users });
}
