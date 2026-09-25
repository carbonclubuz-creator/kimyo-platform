"use client";

// app/admin/page.js
// Admin — Foydalanuvchilar (0-QISM 6-PROMPT). Parol darvozasi endi umumiy
// app/admin/layout.js (AdminAuthProvider) orqali boshqariladi — bu sahifa
// faqat parol allaqachon to'g'ri kiritilgan holatda render qilinadi.
//
// Ro'yxatda: barcha "teacher" va mustaqil ("student" + classId == null)
// foydalanuvchilar. Bittasini tanlasa — maxfiySoz ko'rinadi (admin buni
// Telegram orqali aytilgan javob bilan qo'lda solishtiradi) va "Yangi parol
// yarat" tugmasi bilan parol tiklanadi.
//
// MVP eslatmasi: mustaqil o'quvchi ro'yxatdan o'tish formasida maxfiySoz
// so'ralmaydi (0-QISM sxemasida bu maydon "faqat teacher uchun" deb
// belgilangan) — shuning uchun mustaqil o'quvchilar uchun bu maydon
// "belgilanmagan" bo'lib ko'rinadi. Bu promtlar to'plamidagi spec bo'shlig'i.

import { useEffect, useState } from "react";
import CredentialsCard from "@/components/CredentialsCard";
import { useAdminAuth } from "./AdminAuthProvider";

export default function AdminUsersPage() {
  const { fetchAdmin } = useAdminAuth();

  const [users, setUsers] = useState(null); // null = yuklanmoqda
  const [royxatXato, setRoyxatXato] = useState("");
  const [qidiruv, setQidiruv] = useState("");
  const [tanlangan, setTanlangan] = useState(null);
  const [yangiParol, setYangiParol] = useState(null);
  const [parolYaratilmoqda, setParolYaratilmoqda] = useState(false);

  useEffect(() => {
    yuklash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function yuklash() {
    setUsers(null);
    setRoyxatXato("");
    try {
      const res = await fetchAdmin("/api/admin/users");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRoyxatXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setUsers(data.users || []);
    } catch {
      setRoyxatXato("Server bilan bog'lanishda xatolik");
    }
  }

  async function yangiParolYaratish() {
    if (!tanlangan) return;
    setParolYaratilmoqda(true);
    setYangiParol(null);
    setRoyxatXato("");
    try {
      const res = await fetchAdmin("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: tanlangan.uid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRoyxatXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setYangiParol(data.password);
    } catch {
      setRoyxatXato("Server bilan bog'lanishda xatolik");
    } finally {
      setParolYaratilmoqda(false);
    }
  }

  const filtrlangan = (users || []).filter((u) => {
    if (!qidiruv.trim()) return true;
    const toliqIsm = `${u.ism || ""} ${u.familiya || ""}`.toLowerCase();
    return toliqIsm.includes(qidiruv.trim().toLowerCase());
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Foydalanuvchilar</h1>

      <input
        value={qidiruv}
        onChange={(e) => setQidiruv(e.target.value)}
        placeholder="Ism yoki familiya bo'yicha qidirish..."
        className="mb-4 w-full rounded-xl2 border border-gray-300 px-3 py-2"
      />

      {royxatXato && <p className="mb-4 text-sm text-red-500">{royxatXato}</p>}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          {users === null && <p className="text-gray-400">Yuklanmoqda...</p>}
          {users !== null && filtrlangan.length === 0 && (
            <p className="text-gray-500">Hech kim topilmadi.</p>
          )}
          {filtrlangan.map((u) => (
            <button
              key={u.uid}
              type="button"
              onClick={() => {
                setTanlangan(u);
                setYangiParol(null);
              }}
              className={`rounded-xl2 border px-4 py-3 text-left transition ${
                tanlangan?.uid === u.uid
                  ? "border-primary bg-primary/10"
                  : "border-gray-200 bg-white hover:border-secondary"
              }`}
            >
              <p className="font-semibold">
                {u.ism} {u.familiya}
              </p>
              <p className="text-xs text-gray-400">
                {u.role === "teacher" ? "Ustoz" : "O'quvchi (mustaqil)"} · {u.login}
              </p>
            </button>
          ))}
        </div>

        <div>
          {!tanlangan && <p className="text-gray-400">Ro&apos;yxatdan foydalanuvchi tanlang.</p>}

          {tanlangan && (
            <div className="rounded-xl2 border border-gray-200 bg-white p-5">
              <p className="mb-1 text-lg font-semibold">
                {tanlangan.ism} {tanlangan.familiya}
              </p>
              <p className="mb-4 text-sm text-gray-400">
                {tanlangan.role === "teacher" ? "Ustoz" : "O'quvchi (mustaqil)"} · {tanlangan.login}
              </p>

              <p className="text-sm text-gray-400">Maxfiy so&apos;z</p>
              <p className="mb-4 font-mono text-lg font-semibold">
                {tanlangan.maxfiySoz || "— (belgilanmagan)"}
              </p>

              {!yangiParol && (
                <button
                  type="button"
                  onClick={yangiParolYaratish}
                  disabled={parolYaratilmoqda}
                  className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                >
                  {parolYaratilmoqda ? "Yaratilmoqda..." : "Yangi parol yarat"}
                </button>
              )}

              {yangiParol && (
                <div>
                  <p className="mb-2 text-sm text-gray-500">
                    Yangi parolni Telegram orqali foydalanuvchiga yetkazing:
                  </p>
                  <CredentialsCard login={tanlangan.login} password={yangiParol} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
