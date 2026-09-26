"use client";

// app/student/StudentHeader.js
// O'quvchi paneli yuqori paneli: qolgan jonlar ko'rsatkichi ("❤️❤️❤️❤️🖤 4/5"),
// ism-familiya va "Chiqish" tugmasi.

import Link from "next/link";
import { useStudentAuth } from "@/app/student/AuthProvider";
import { KUNLIK_JON_SONI } from "@/lib/heartsHelpers";

export default function StudentHeader() {
  const { userData, qolganJon, logout } = useStudentAuth();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <Link href="/student" className="text-lg font-bold text-primary">
        Kimyo
      </Link>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 text-sm" title={`${qolganJon}/${KUNLIK_JON_SONI} jon qoldi`}>
          <span>
            {"❤️".repeat(qolganJon)}
            {"🖤".repeat(KUNLIK_JON_SONI - qolganJon)}
          </span>
          <span className="text-gray-400">
            {qolganJon}/{KUNLIK_JON_SONI}
          </span>
        </span>
        <span className="text-sm text-gray-600">
          {userData?.ism} {userData?.familiya}
        </span>
        <Link
          href="/student/account"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Akkount
        </Link>
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
