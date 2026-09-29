"use client";

// app/admin/AdminHeader.js
// Admin bo'limi yuqori paneli: "Foydalanuvchilar" (parol tiklash, 6-PROMPT),
// "Parol so'rovlari" (mustaqil o'quvchi/ustoz so'rovlari), "Ustozdan xabar",
// "Yangiliklar" (3-BOSQICH), "Savollar" (test kontenti, 7-PROMPT) va "Bonus jon" (5A)
// o'rtasida navigatsiya + Chiqish.
// "Parol so'rovlari" va "Ustozdan xabar" yonida yangi (javobsiz) narsalar soni
// qizil belgi bilan ko'rinadi; son har 60 soniyada, sahifa qayta faollashganda
// va sahifalarda amal bajarilganda ("admin-sonlar-ozgardi" hodisasi) yangilanadi.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "./AdminAuthProvider";

const YANGILASH_ORALIGI_MS = 60000;

function Belgi({ son }) {
  if (!son) return null;
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
      {son}
    </span>
  );
}

export default function AdminHeader() {
  const { chiqish, fetchAdmin } = useAdminAuth();
  const pathname = usePathname();
  const [sonlar, setSonlar] = useState({ parolSorovlari: 0, ustozXabarlari: 0 });

  const sonlarniYangila = useCallback(async () => {
    try {
      const res = await fetchAdmin("/api/admin/sonlar");
      if (!res.ok) return;
      const data = await res.json();
      setSonlar({
        parolSorovlari: data.parolSorovlari || 0,
        ustozXabarlari: data.ustozXabarlari || 0,
      });
    } catch {
      // jim — belgi eski qiymatni ko'rsatib turadi
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sonlarniYangila();
    // Yashirin (fon) tabda so'rov yubormaymiz — Firestore o'qishlarini tejaydi;
    // tabga qaytilganda "focus" hodisasi baribir yangilaydi.
    const interval = setInterval(() => {
      if (!document.hidden) sonlarniYangila();
    }, YANGILASH_ORALIGI_MS);
    window.addEventListener("focus", sonlarniYangila);
    window.addEventListener("admin-sonlar-ozgardi", sonlarniYangila);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", sonlarniYangila);
      window.removeEventListener("admin-sonlar-ozgardi", sonlarniYangila);
    };
  }, [sonlarniYangila]);

  const tabClass = (active) =>
    `relative rounded-lg px-3 py-1.5 text-sm font-medium ${
      active ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-lg font-bold text-primary">Admin</span>
        <Link href="/admin" className={tabClass(pathname === "/admin")}>
          Foydalanuvchilar
        </Link>
        <Link
          href="/admin/parol-sorovlari"
          className={tabClass(pathname === "/admin/parol-sorovlari")}
        >
          Parol so&apos;rovlari
          <Belgi son={sonlar.parolSorovlari} />
        </Link>
        <Link href="/admin/xabarlar" className={tabClass(pathname === "/admin/xabarlar")}>
          Ustozdan xabar
          <Belgi son={sonlar.ustozXabarlari} />
        </Link>
        <Link href="/admin/yangiliklar" className={tabClass(pathname === "/admin/yangiliklar")}>
          Yangiliklar
        </Link>
        <Link href="/admin/questions" className={tabClass(pathname === "/admin/questions")}>
          Savollar
        </Link>
        <Link href="/admin/bonus" className={tabClass(pathname === "/admin/bonus")}>
          Bonus jon
        </Link>
      </div>
      <button
        type="button"
        onClick={chiqish}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
      >
        Chiqish
      </button>
    </header>
  );
}
