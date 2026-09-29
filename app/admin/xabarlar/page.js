"use client";

// app/admin/xabarlar/page.js
// Admin — "Ustozdan xabar". Ustozlar Akkount > "Adminga xabar yuborish" orqali
// yozgan xabarlar shu yerga tushadi (oxirgisi birinchi). Admin javob yozadi —
// javob ustozning Xabarlar (inbox) qismiga "Admin" belgisi bilan tushadi va o'zi
// o'chib ketmaydi (ustoz xohlasa o'zi o'chiradi). Xabarni admin o'z ro'yxatidan
// tasdiqlash oynasi bilan o'chira oladi (ustozga tushgan javoblarga tegmaydi).

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { toshkentSanaVaqt } from "@/lib/vaqt";
import { useAdminAuth } from "../AdminAuthProvider";

const JAVOB_MAX_UZUNLIK = 1000;

function sonlarOzgardi() {
  window.dispatchEvent(new Event("admin-sonlar-ozgardi"));
}

export default function AdminUstozXabarlariPage() {
  const { fetchAdmin } = useAdminAuth();
  const [xabarlar, setXabarlar] = useState(null); // null = yuklanmoqda
  const [xato, setXato] = useState("");

  const yuklash = useCallback(async () => {
    setXato("");
    try {
      const res = await fetchAdmin("/api/admin/xabarlar");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setXabarlar(data.xabarlar || []);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    yuklash();
  }, [yuklash]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Ustozdan xabar</h1>

      {xato && <p className="mb-4 text-sm text-red-500">{xato}</p>}
      {xabarlar === null && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}
      {xabarlar !== null && xabarlar.length === 0 && (
        <p className="text-gray-500">Ustozlardan xabar yo&apos;q.</p>
      )}

      <div className="flex flex-col gap-4">
        {xabarlar?.map((x) => (
          <XabarKarta
            key={x.id}
            xabar={x}
            onOzgardi={() => {
              yuklash();
              sonlarOzgardi();
            }}
          />
        ))}
      </div>
    </main>
  );
}

function XabarKarta({ xabar, onOzgardi }) {
  const { fetchAdmin } = useAdminAuth();
  const [javob, setJavob] = useState("");
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [ochirishTasdiq, setOchirishTasdiq] = useState(false);
  const [ochirilmoqda, setOchirilmoqda] = useState(false);

  async function javobYuborish(e) {
    e.preventDefault();
    setXato("");
    if (!javob.trim()) {
      setXato("Javob matnini yozing");
      return;
    }
    setYuborilmoqda(true);
    try {
      const res = await fetchAdmin(`/api/admin/xabarlar/${xabar.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ javob }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setJavob("");
      onOzgardi();
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYuborilmoqda(false);
    }
  }

  async function ochirish() {
    setOchirilmoqda(true);
    setXato("");
    try {
      const res = await fetchAdmin(`/api/admin/xabarlar/${xabar.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setXato(data.error || "Xatolik yuz berdi");
        setOchirishTasdiq(false);
        return;
      }
      setOchirishTasdiq(false);
      onOzgardi();
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
      setOchirishTasdiq(false);
    } finally {
      setOchirilmoqda(false);
    }
  }

  return (
    <div
      className={`rounded-xl2 border bg-white p-5 ${
        xabar.javobBerilgan ? "border-gray-200" : "border-primary"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="font-semibold">
          {xabar.teacherIsm} {xabar.teacherFamiliya}
        </p>
        <span className="text-xs text-gray-400">{xabar.teacherLogin}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            xabar.javobBerilgan ? "bg-gray-100 text-gray-500" : "bg-primary/15 text-primary-dark"
          }`}
        >
          {xabar.javobBerilgan ? "Javob berildi" : "Javob kutilmoqda"}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {xabar.vaqt ? toshkentSanaVaqt(xabar.vaqt) : ""}
        </span>
      </div>

      <p className="whitespace-pre-wrap break-words text-gray-800">{xabar.matn}</p>

      {xabar.javoblar.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-l-2 border-primary pl-3">
          {xabar.javoblar.map((j, i) => (
            <div key={i}>
              <p className="text-xs text-gray-400">
                Sizning javobingiz{j.vaqt ? ` · ${toshkentSanaVaqt(j.vaqt)}` : ""}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{j.matn}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={javobYuborish} className="mt-4 flex flex-col gap-2">
        <textarea
          value={javob}
          onChange={(e) => setJavob(e.target.value)}
          maxLength={JAVOB_MAX_UZUNLIK}
          rows={3}
          placeholder="Javob yozing..."
          className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
        />
        {xato && <p className="text-sm text-red-500">{xato}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={yuborilmoqda}
            className="rounded-xl2 bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {yuborilmoqda ? "Yuborilmoqda..." : "Javob yuborish"}
          </button>
          <button
            type="button"
            onClick={() => setOchirishTasdiq(true)}
            className="rounded-xl2 border border-red-300 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50"
          >
            O&apos;chirish
          </button>
        </div>
      </form>

      {ochirishTasdiq && (
        <Modal title="Ishonchingiz komilmi?" onClose={() => setOchirishTasdiq(false)}>
          <p className="mb-4 text-sm text-gray-600">
            Xabar sizning ro&apos;yxatingizdan o&apos;chiriladi. Ustozga yuborilgan javoblar
            o&apos;chmaydi.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOchirishTasdiq(false)}
              className="flex-1 rounded-xl2 border border-gray-300 px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={ochirilmoqda}
              onClick={ochirish}
              className="flex-1 rounded-xl2 bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {ochirilmoqda ? "..." : "Ha, o'chirish"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
