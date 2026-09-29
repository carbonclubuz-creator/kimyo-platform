"use client";

// app/student/join/page.js
// Mustaqil o'quvchining "Sinfga qo'shilish" sahifasi (0-QISM 6.6-band):
// do'stidan olingan 6 xonali hashtegni kiritadi -> so'rov ustozning
// Xabarlariga tushadi. Holatlar: so'rov yo'q / kutilmoqda (bekor qilish
// mumkin) / rad etildi (qayta yuborish mumkin) / allaqachon sinfda.
// Ustoz qabul qilganda o'quvchining classId'si o'zgaradi va sahifa
// (userData realtime) avtomatik "sinfdasiz" holatiga o'tadi.

import { useCallback, useEffect, useState } from "react";
import { useStudentAuth } from "@/app/student/AuthProvider";
import BackLink from "@/components/BackLink";

export default function StudentJoinPage() {
  const { user, userData } = useStudentAuth();

  const [holat, setHolat] = useState(null); // null = yuklanmoqda
  const [hashteg, setHashteg] = useState("");
  const [maxfiySoz, setMaxfiySoz] = useState("");
  const [xato, setXato] = useState("");
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  const yukla = useCallback(async () => {
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/student/join", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setHolat(data);
    } catch {
      // jim — "Yuklanmoqda..." qoladi, foydalanuvchi sahifani yangilaydi
    }
  }, [user]);

  useEffect(() => {
    yukla();
    // Ustoz qabul qilgan/rad etgan bo'lishi mumkin — sahifa ochiq turganda
    // ham holatni vaqti-vaqti bilan yangilab turamiz.
    const interval = setInterval(yukla, 20000);
    return () => clearInterval(interval);
  }, [yukla, userData?.classId]);

  async function yuborish(e) {
    e.preventDefault();
    setXato("");
    setYuborilmoqda(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/student/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ hashteg, maxfiySoz }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setHashteg("");
      setMaxfiySoz("");
      await yukla();
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYuborilmoqda(false);
    }
  }

  async function bekorQilish() {
    setXato("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/student/join", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        setXato("Xatolik yuz berdi");
        return;
      }
      await yukla();
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    }
  }

  if (holat === null) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="text-gray-400">Yuklanmoqda...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <BackLink href="/student" />
      <h1 className="mb-6 text-2xl font-bold">Sinfga qo&apos;shilish</h1>

      {holat.sinfda && (
        <p className="rounded-xl2 border border-green-200 bg-green-50 p-4 text-green-700">
          Siz sinfdasiz. Sinfingiz reytingini &quot;Reyting&quot; bo&apos;limidagi &quot;Sinf&quot;
          tabida ko&apos;rishingiz mumkin.
        </p>
      )}

      {!holat.sinfda && holat.holati === "kutilmoqda" && (
        <div className="rounded-xl2 border border-gray-200 bg-white p-4">
          <p className="font-semibold">Kutilmoqda</p>
          <p className="mb-4 mt-1 text-sm text-gray-600">
            &quot;{holat.classNomi}&quot; sinfiga so&apos;rovingiz ustozga yuborildi. Ustoz qabul
            qilishi bilan siz sinfga qo&apos;shilasiz.
          </p>
          {xato && <p className="mb-2 text-sm text-red-500">{xato}</p>}
          <button
            type="button"
            onClick={bekorQilish}
            className="rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            So&apos;rovni bekor qilish
          </button>
        </div>
      )}

      {!holat.sinfda && holat.holati !== "kutilmoqda" && (
        <form onSubmit={yuborish} className="flex flex-col gap-3">
          {holat.holati === "rad_etildi" && (
            <p className="rounded-xl2 border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              Rad etildi: &quot;{holat.classNomi}&quot; sinfi ustozi so&apos;rovingizni qabul
              qilmadi. Xohlasangiz, qayta so&apos;rov yuborishingiz mumkin.
            </p>
          )}

          <p className="text-sm text-gray-600">
            Do&apos;stingizdan olingan sinf hashtegini (6 ta raqam) kiriting.
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Hashteg (masalan 123456)"
            value={hashteg}
            onChange={(e) => setHashteg(e.target.value)}
            className="rounded-xl2 border border-gray-300 px-4 py-3"
          />

          {holat.maxfiySozKerak && (
            <div>
              <input
                type="text"
                placeholder="Maxfiy so'z (parolni tiklash uchun)"
                value={maxfiySoz}
                onChange={(e) => setMaxfiySoz(e.target.value)}
                className="w-full rounded-xl2 border border-gray-300 px-4 py-3"
              />
              <p className="mt-1 text-xs text-gray-400">
                Bu so&apos;zni eslab qoling — sinfga qo&apos;shilgach parolingizni tiklash uchun
                kerak bo&apos;ladi (kamida 4 belgi).
              </p>
            </div>
          )}

          {xato && <p className="text-sm text-red-500">{xato}</p>}

          <button
            type="submit"
            disabled={yuborilmoqda}
            className="rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {yuborilmoqda ? "Yuborilmoqda..." : "So'rov yuborish"}
          </button>
        </form>
      )}
    </main>
  );
}
