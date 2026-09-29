"use client";

// app/admin/AdminHeader.js
// Admin bo'limi yuqori paneli: "Foydalanuvchilar" (parol tiklash, 6-PROMPT)
// "Savollar" (test kontenti, 7-PROMPT) va "Bonus jon" (5A) o'rtasida navigatsiya + Chiqish.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "./AdminAuthProvider";

export default function AdminHeader() {
  const { chiqish } = useAdminAuth();
  const pathname = usePathname();

  const tabClass = (active) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center gap-2">
        <span className="mr-2 text-lg font-bold text-primary">Admin</span>
        <Link href="/admin" className={tabClass(pathname === "/admin")}>
          Foydalanuvchilar
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
