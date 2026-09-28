"use client";

// app/teacher/TeacherHeader.js
// Ustoz paneli yuqori paneli: ism-familiya, pochta belgisi (yangi xabar
// bo'lsa qizil son bilan), "Akkount" havolasi va "Chiqish" tugmasi.
// Xabarlar soni har 30 soniyada va sahifa qayta faollashganda serverdan
// yangilanadi (realtime emas — xabarlar faqat server orqali o'qiladi).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import { MailIcon } from "@/components/icons";

const YANGILASH_ORALIGI_MS = 30000;

export default function TeacherHeader() {
  const { user, userData, logout } = useTeacherAuth();
  const [soni, setSoni] = useState(0);

  const sonniYangila = useCallback(async () => {
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/teacher/messages?faqatSoni=1", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSoni(data.soni || 0);
    } catch {
      // jim — belgi eski qiymatni ko'rsatib turadi
    }
  }, [user]);

  useEffect(() => {
    sonniYangila();
    const interval = setInterval(sonniYangila, YANGILASH_ORALIGI_MS);
    window.addEventListener("focus", sonniYangila);
    // Xabarlar sahifasida amal bajarilganda darhol yangilash uchun.
    window.addEventListener("xabarlar-ozgardi", sonniYangila);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", sonniYangila);
      window.removeEventListener("xabarlar-ozgardi", sonniYangila);
    };
  }, [sonniYangila]);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <Link href="/teacher" className="text-lg font-bold text-primary">
        Ustoz paneli
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {userData?.ism} {userData?.familiya}
        </span>
        <Link
          href="/teacher/xabarlar"
          className="relative rounded-lg border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="Xabarlar"
        >
          <MailIcon />
          {soni > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
              {soni}
            </span>
          )}
        </Link>
        <Link
          href="/teacher/account"
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
