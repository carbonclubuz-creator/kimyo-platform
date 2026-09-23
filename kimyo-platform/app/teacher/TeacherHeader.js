"use client";

// app/teacher/TeacherHeader.js
// Ustoz paneli yuqori paneli: ism-familiya va "Chiqish" tugmasi.
// To'liq navigatsiya (Sinflar / Akkount va h.k.) keyingi promtda qo'shiladi.

import Link from "next/link";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";

export default function TeacherHeader() {
  const { userData, logout } = useTeacherAuth();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <Link href="/teacher" className="text-lg font-bold text-primary">
        Ustoz paneli
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {userData?.ism} {userData?.familiya}
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Chiqish
        </button>
      </div>
    </header>
  );
}
