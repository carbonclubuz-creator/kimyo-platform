"use client";

// app/admin/bonus/page.js
// Admin — Bonus jon (5A). Imtihon oldi/bayram kunlari barcha o'quvchilarga
// bonus jon yoqiladi. Joriy holat + forma (soni, muddat, e'lon matni) +
// "Yoqish"; bosilganda BITTA tasdiqlash oynasi (tanlangan qiymatlar
// xulosasi bilan). O'chirish ham tasdiqlash bilan (yengilroq matn).

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { MUDDAT_VARIANTLARI, XABAR_MAX_UZUNLIK } from "@/lib/bonusMantiq";
import { toshkentSanaVaqt } from "@/lib/vaqt";
import { useAdminAuth } from "../AdminAuthProvider";

export default function AdminBonusPage() {
  const { fetchAdmin } = useAdminAuth();

  const [holat, setHolat] = useState(null); // null = yuklanmoqda
  const [xato, setXato] = useState("");
  const [soni, setSoni] = useState(3);
  const [muddat, setMuddat] = useState("yangilanishgacha");
  const [xabar, setXabar] = useState("");
  const [tasdiq, setTasdiq] = useState(null); // "yoqish" | "ochirish" | null
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  useEffect(() => {
    yuklash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function yuklash() {
    setXato("");
    try {
      const res = await fetchAdmin("/api/admin/bonus");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setHolat(data);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    }
  }

  async function yuborish(tanlov) {
    setYuborilmoqda(true);
    setXato("");
    try {
      const body =
        tanlov === "yoqish" ? { faol: true, soni, muddat, xabar } : { faol: false };
      const res = await fetchAdmin("/api/admin/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setHolat(data);
      setTasdiq(null);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYuborilmoqda(false);
    }
  }

  const muddatLabel = MUDDAT_VARIANTLARI.find((m) => m.key === muddat)?.label;

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Bonus jon</h1>

      {xato && <p className="mb-4 text-sm text-red-500">{xato}</p>}
      {holat === null && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}

      {holat && (
        <>
          <div
            className={`mb-6 rounded-xl2 border-2 p-4 ${
              holat.faol ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
            }`}
          >
            <p className="mb-1 text-sm text-gray-500">Joriy holat</p>
            {holat.faol ? (
              <>
                <p className="text-lg font-bold text-primary-dark">Yoqilgan: +{holat.soni} jon</p>
                <p className="text-sm text-gray-600">
                  {holat.tugash
                    ? `Tugash: ${toshkentSanaVaqt(holat.tugash)} (Toshkent vaqti)`
                    : "Qo'lda o'chirilmaguncha davom etadi"}
                </p>
                {holat.xabar && <p className="mt-1 text-sm text-gray-600">E&apos;lon: {holat.xabar}</p>}
                <button
                  type="button"
                  onClick={() => setTasdiq("ochirish")}
                  className="mt-3 rounded-xl2 border border-red-300 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50"
                >
                  O&apos;chirish
                </button>
              </>
            ) : (
              <p className="text-lg font-bold text-gray-500">O&apos;chirilgan</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTasdiq("yoqish");
            }}
            className="flex flex-col gap-4 rounded-xl2 border border-gray-200 bg-white p-5"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="soni">
                Bonus jon soni
              </label>
              <select
                id="soni"
                value={soni}
                onChange={(e) => setSoni(Number(e.target.value))}
                className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    +{n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="muddat">
                Muddat
              </label>
              <select
                id="muddat"
                value={muddat}
                onChange={(e) => setMuddat(e.target.value)}
                className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
              >
                {MUDDAT_VARIANTLARI.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="xabar">
                E&apos;lon matni (ixtiyoriy)
              </label>
              <input
                id="xabar"
                value={xabar}
                maxLength={XABAR_MAX_UZUNLIK}
                onChange={(e) => setXabar(e.target.value)}
                placeholder="Masalan: Imtihonga omad!"
                className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-400">
                {xabar.length}/{XABAR_MAX_UZUNLIK}
              </p>
            </div>
            <button
              type="submit"
              className="rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark"
            >
              Yoqish
            </button>
          </form>
        </>
      )}

      {tasdiq === "yoqish" && (
        <Modal title="Tasdiqlang" onClose={() => setTasdiq(null)}>
          <p className="mb-3 text-sm text-gray-600">
            Bonus jonni rostdan ham yoqmoqchimisiz? Barcha o&apos;quvchilarga darhol ta&apos;sir qiladi.
          </p>
          <ul className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
            <li>Soni: <b>+{soni}</b></li>
            <li>Muddat: <b>{muddatLabel}</b></li>
            <li>E&apos;lon: <b>{xabar.trim() || "—"}</b></li>
          </ul>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTasdiq(null)}
              className="flex-1 rounded-xl2 border border-gray-300 px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Bekor
            </button>
            <button
              type="button"
              disabled={yuborilmoqda}
              onClick={() => yuborish("yoqish")}
              className="flex-1 rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {yuborilmoqda ? "..." : "Ha, yoqish"}
            </button>
          </div>
        </Modal>
      )}

      {tasdiq === "ochirish" && (
        <Modal title="Bonus jonni o'chirish" onClose={() => setTasdiq(null)}>
          <p className="mb-4 text-sm text-gray-600">Bonus jon o&apos;chirilsinmi?</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTasdiq(null)}
              className="flex-1 rounded-xl2 border border-gray-300 px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Bekor
            </button>
            <button
              type="button"
              disabled={yuborilmoqda}
              onClick={() => yuborish("ochirish")}
              className="flex-1 rounded-xl2 bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {yuborilmoqda ? "..." : "Ha, o'chirish"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
