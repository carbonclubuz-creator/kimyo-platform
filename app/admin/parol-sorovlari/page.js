"use client";

// app/admin/parol-sorovlari/page.js
// Admin — Parol so'rovlari. Mustaqil o'quvchi va ustozlar login oynasida
// Ism, Familiya, Viloyatni yuboradi; so'rov shu yerga tushadi. Har so'rov ostida
// bazadan shunga MOS foydalanuvchilar ro'yxati (maxfiy so'zlari bilan) chiqadi.
// Admin Telegramda o'quvchi yuborgan maxfiy so'zni shu yerdagi bilan solishtiradi,
// mos kelganiga parolni yuboradi:
//   - "Mavjud parolni ko'rsatish" (faqat saqlangan parol bo'lsa — masalan ustoz
//     yaratib, keyin sinfdan chiqargan o'quvchi), yoki
//   - "Yangi parol yarat" (mavjud reset-password mexanizmi).
// So'ng "Bajarildi" bilan so'rov ro'yxatdan o'chiriladi.

import { useCallback, useEffect, useState } from "react";
import CredentialsCard from "@/components/CredentialsCard";
import { toshkentSanaVaqt } from "@/lib/vaqt";
import { useAdminAuth } from "../AdminAuthProvider";

function sonlarOzgardi() {
  window.dispatchEvent(new Event("admin-sonlar-ozgardi"));
}

export default function AdminParolSorovlariPage() {
  const { fetchAdmin } = useAdminAuth();
  const [sorovlar, setSorovlar] = useState(null); // null = yuklanmoqda
  const [xato, setXato] = useState("");

  const yuklash = useCallback(async () => {
    setXato("");
    try {
      const res = await fetchAdmin("/api/admin/parol-sorovlari");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setSorovlar(data.sorovlar || []);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    yuklash();
  }, [yuklash]);

  function sorovOchirildi(id) {
    setSorovlar((royxat) => (royxat || []).filter((s) => s.id !== id));
    sonlarOzgardi();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Parol so&apos;rovlari</h1>
        <button
          type="button"
          onClick={() => {
            setSorovlar(null);
            yuklash();
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Yangilash
        </button>
      </div>

      {xato && <p className="mb-4 text-sm text-red-500">{xato}</p>}
      {sorovlar === null && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}
      {sorovlar !== null && sorovlar.length === 0 && (
        <p className="text-gray-500">Yangi so&apos;rovlar yo&apos;q.</p>
      )}

      <div className="flex flex-col gap-5">
        {sorovlar?.map((s) => (
          <SorovKarta key={s.id} sorov={s} onOchirildi={() => sorovOchirildi(s.id)} />
        ))}
      </div>
    </main>
  );
}

function SorovKarta({ sorov, onOchirildi }) {
  const { fetchAdmin } = useAdminAuth();
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");

  async function bajarildi() {
    setBand(true);
    setXato("");
    try {
      const res = await fetchAdmin(`/api/admin/parol-sorovlari/${sorov.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      onOchirildi();
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setBand(false);
    }
  }

  const ustozMi = sorov.rol === "ustoz";

  return (
    <div className="rounded-xl2 border border-gray-200 bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold">
          {sorov.ism} {sorov.familiya}
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            ustozMi ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary-dark"
          }`}
        >
          {ustozMi ? "Ustoz" : "O'quvchi"}
        </span>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        {sorov.viloyat}
        {sorov.vaqt ? ` · ${toshkentSanaVaqt(sorov.vaqt)}` : ""}
      </p>

      <p className="mb-2 text-sm font-medium text-gray-600">
        Bazadagi mos {ustozMi ? "ustozlar" : "mustaqil o'quvchilar"} ({sorov.mos.length})
      </p>

      {sorov.mos.length === 0 && (
        <p className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
          Bazadan mos foydalanuvchi topilmadi. Ism-familiya yoki viloyat boshqacha yozilgan
          bo&apos;lishi mumkin — &quot;Foydalanuvchilar&quot; bo&apos;limidan qidirib ko&apos;ring.
          {!ustozMi &&
            " Agar bu sinfdagi o'quvchi bo'lsa, parolini uning ustozi tiklaydi."}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {sorov.mos.map((u) => (
          <MosFoydalanuvchi key={u.uid} u={u} />
        ))}
      </div>

      {xato && <p className="mt-3 text-sm text-red-500">{xato}</p>}

      <button
        type="button"
        onClick={bajarildi}
        disabled={band}
        className="mt-4 rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {band ? "..." : "Bajarildi"}
      </button>
    </div>
  );
}

function MosFoydalanuvchi({ u }) {
  const { fetchAdmin } = useAdminAuth();
  const [mavjudKorinsin, setMavjudKorinsin] = useState(false);
  const [yangiParol, setYangiParol] = useState(null);
  const [yaratilmoqda, setYaratilmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function yangiParolYaratish() {
    setYaratilmoqda(true);
    setXato("");
    try {
      const res = await fetchAdmin("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: u.uid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setYangiParol(data.password);
      setMavjudKorinsin(false); // eski parol endi yaroqsiz
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYaratilmoqda(false);
    }
  }

  const tugma =
    "rounded-xl2 px-4 py-2 text-sm font-semibold disabled:opacity-60";

  return (
    <div className="rounded-xl2 border border-gray-200 bg-gray-50 p-4">
      <p className="font-semibold">
        {u.ism} {u.familiya}
      </p>
      <p className="mb-3 text-xs text-gray-400">
        {u.login}
        {u.tuman ? ` · ${u.tuman}` : ""}
        {u.maktabMarkaz ? ` · ${u.maktabMarkaz}` : ""}
      </p>

      <p className="text-sm text-gray-400">Maxfiy so&apos;z</p>
      <p className="mb-3 break-words font-mono text-lg font-semibold">
        {u.maxfiySoz || "— (belgilanmagan)"}
      </p>

      {mavjudKorinsin && u.mavjudParol && !yangiParol && (
        <div className="mb-3">
          <p className="mb-2 text-sm text-gray-500">
            Mavjud parolni Telegram orqali foydalanuvchiga yetkazing:
          </p>
          <CredentialsCard login={u.login} password={u.mavjudParol} />
        </div>
      )}

      {yangiParol && (
        <div className="mb-3">
          <p className="mb-2 text-sm text-gray-500">
            Yangi parolni Telegram orqali foydalanuvchiga yetkazing:
          </p>
          <CredentialsCard login={u.login} password={yangiParol} />
        </div>
      )}

      {xato && <p className="mb-2 text-sm text-red-500">{xato}</p>}

      {!yangiParol && (
        <div className="flex flex-wrap gap-2">
          {u.mavjudParol && !mavjudKorinsin && (
            <button
              type="button"
              onClick={() => setMavjudKorinsin(true)}
              className={`${tugma} border border-gray-300 text-gray-700 hover:bg-white`}
            >
              Mavjud parolni ko&apos;rsatish
            </button>
          )}
          <button
            type="button"
            onClick={yangiParolYaratish}
            disabled={yaratilmoqda}
            className={`${tugma} bg-primary text-white hover:bg-primary-dark`}
          >
            {yaratilmoqda ? "Yaratilmoqda..." : "Yangilash (yangi parol)"}
          </button>
        </div>
      )}
    </div>
  );
}
