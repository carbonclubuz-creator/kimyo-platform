"use client";

// app/admin/questions/page.js
// Admin — Test kontent kiritish (0-QISM 7-PROMPT). Mavzu tanlash yoki yangi
// mavzu yaratish, so'ng shu mavzuga savol qo'shish formasi (matn, 4 variant,
// radio bilan to'g'ri javob). Qo'shilgan savollar ro'yxati shu mavzu ostida
// ko'rinadi, oddiy darajada tahrirlash/o'chirish bilan.

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/app/admin/AdminAuthProvider";

const BOSH_FORMA = { matn: "", variantlar: ["", "", "", ""], togriJavobIndex: 0 };

export default function AdminQuestionsPage() {
  const { fetchAdmin } = useAdminAuth();

  const [mavzular, setMavzular] = useState(null); // null = yuklanmoqda
  const [mavzuXato, setMavzuXato] = useState("");
  const [tanlanganMavzuId, setTanlanganMavzuId] = useState("");
  const [yangiMavzuNomi, setYangiMavzuNomi] = useState("");
  const [mavzuYaratilmoqda, setMavzuYaratilmoqda] = useState(false);

  const [savollar, setSavollar] = useState(null); // null = yuklanmoqda / tanlanmagan
  const [savolXato, setSavolXato] = useState("");

  const [forma, setForma] = useState(BOSH_FORMA);
  const [tahrirlanayotganId, setTahrirlanayotganId] = useState(null); // null = yangi savol
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  useEffect(() => {
    mavzularniYukla();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tanlanganMavzuId) {
      setSavollar(null);
      return;
    }
    savollarniYukla(tanlanganMavzuId);
    formaniTozalash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanlanganMavzuId]);

  async function mavzularniYukla() {
    setMavzuXato("");
    try {
      const res = await fetchAdmin("/api/admin/mavzular");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMavzuXato(data.error || "Xatolik yuz berdi");
        return;
      }
      const ro = data.mavzular || [];
      setMavzular(ro);
      if (!tanlanganMavzuId && ro.length > 0) {
        setTanlanganMavzuId(ro[0].id);
      }
    } catch {
      setMavzuXato("Server bilan bog'lanishda xatolik");
    }
  }

  async function yangiMavzuYaratish(e) {
    e.preventDefault();
    const nomi = yangiMavzuNomi.trim();
    if (!nomi) return;

    setMavzuYaratilmoqda(true);
    setMavzuXato("");
    try {
      const res = await fetchAdmin("/api/admin/mavzular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomi }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMavzuXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setYangiMavzuNomi("");
      await mavzularniYukla();
      setTanlanganMavzuId(data.id);
    } catch {
      setMavzuXato("Server bilan bog'lanishda xatolik");
    } finally {
      setMavzuYaratilmoqda(false);
    }
  }

  async function savollarniYukla(mavzuId) {
    setSavollar(null);
    setSavolXato("");
    try {
      const res = await fetchAdmin(`/api/admin/savollar?mavzuId=${encodeURIComponent(mavzuId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSavolXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setSavollar(data.savollar || []);
    } catch {
      setSavolXato("Server bilan bog'lanishda xatolik");
    }
  }

  function formaniTozalash() {
    setForma(BOSH_FORMA);
    setTahrirlanayotganId(null);
  }

  function tahrirlashniBoshlash(savol) {
    setForma({
      matn: savol.matn,
      variantlar: [...savol.variantlar],
      togriJavobIndex: savol.togriJavobIndex,
    });
    setTahrirlanayotganId(savol.id);
  }

  function variantniOzgartirish(index, value) {
    setForma((f) => {
      const yangi = [...f.variantlar];
      yangi[index] = value;
      return { ...f, variantlar: yangi };
    });
  }

  async function formaniYuborish(e) {
    e.preventDefault();
    setSavolXato("");
    setSaqlanmoqda(true);
    try {
      const body = {
        mavzuId: tanlanganMavzuId,
        matn: forma.matn,
        variantlar: forma.variantlar,
        togriJavobIndex: forma.togriJavobIndex,
      };
      const url = tahrirlanayotganId
        ? `/api/admin/savollar/${tahrirlanayotganId}`
        : "/api/admin/savollar";
      const res = await fetchAdmin(url, {
        method: tahrirlanayotganId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSavolXato(data.error || "Xatolik yuz berdi");
        return;
      }
      formaniTozalash();
      await savollarniYukla(tanlanganMavzuId);
    } catch {
      setSavolXato("Server bilan bog'lanishda xatolik");
    } finally {
      setSaqlanmoqda(false);
    }
  }

  async function ochirish(savolId) {
    // eslint-disable-next-line no-alert
    if (!window.confirm("Bu savolni o'chirishga ishonchingiz komilmi?")) return;
    setSavolXato("");
    try {
      const res = await fetchAdmin(`/api/admin/savollar/${savolId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSavolXato(data.error || "Xatolik yuz berdi");
        return;
      }
      if (tahrirlanayotganId === savolId) formaniTozalash();
      await savollarniYukla(tanlanganMavzuId);
    } catch {
      setSavolXato("Server bilan bog'lanishda xatolik");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Savollar</h1>

      {mavzuXato && <p className="mb-4 text-sm text-red-500">{mavzuXato}</p>}

      <div className="mb-6 flex flex-col gap-3 rounded-xl2 border border-gray-200 bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-600">Mavzu</label>
          <select
            value={tanlanganMavzuId}
            onChange={(e) => setTanlanganMavzuId(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
          >
            {mavzular === null && <option>Yuklanmoqda...</option>}
            {mavzular !== null && mavzular.length === 0 && <option value="">Mavzular yo&apos;q</option>}
            {mavzular?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nomi}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={yangiMavzuYaratish} className="flex flex-1 items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-600">Yangi mavzu</label>
            <input
              value={yangiMavzuNomi}
              onChange={(e) => setYangiMavzuNomi(e.target.value)}
              placeholder="Masalan: Mol tushunchasi"
              className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={mavzuYaratilmoqda}
            className="shrink-0 rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-60"
          >
            {mavzuYaratilmoqda ? "..." : "Qo'shish"}
          </button>
        </form>
      </div>

      {tanlanganMavzuId && (
        <>
          <form
            onSubmit={formaniYuborish}
            className="mb-6 flex flex-col gap-4 rounded-xl2 border border-gray-200 bg-white p-5"
          >
            <p className="font-semibold">
              {tahrirlanayotganId ? "Savolni tahrirlash" : "Yangi savol"}
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Savol matni</label>
              <textarea
                value={forma.matn}
                onChange={(e) => setForma((f) => ({ ...f, matn: e.target.value }))}
                rows={2}
                className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-600">
                Javob variantlari (to&apos;g&apos;risini belgilang)
              </label>
              {forma.variantlar.map((v, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="togriJavob"
                    checked={forma.togriJavobIndex === i}
                    onChange={() => setForma((f) => ({ ...f, togriJavobIndex: i }))}
                  />
                  <input
                    value={v}
                    onChange={(e) => variantniOzgartirish(i, e.target.value)}
                    placeholder={`${i + 1}-variant`}
                    className="flex-1 rounded-xl2 border border-gray-300 px-3 py-2"
                  />
                </div>
              ))}
            </div>

            {savolXato && <p className="text-sm text-red-500">{savolXato}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saqlanmoqda}
                className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {saqlanmoqda ? "Saqlanmoqda..." : tahrirlanayotganId ? "Saqlash" : "Qo'shish"}
              </button>
              {tahrirlanayotganId && (
                <button
                  type="button"
                  onClick={formaniTozalash}
                  className="rounded-xl2 border border-gray-300 px-4 py-2.5 text-gray-600 hover:bg-gray-100"
                >
                  Bekor qilish
                </button>
              )}
            </div>
          </form>

          <div className="flex flex-col gap-2">
            {savollar === null && <p className="text-gray-400">Yuklanmoqda...</p>}
            {savollar !== null && savollar.length === 0 && (
              <p className="text-gray-500">Bu mavzuda hali savollar yo&apos;q.</p>
            )}
            {savollar?.map((s, i) => (
              <div key={s.id} className="rounded-xl2 border border-gray-200 bg-white p-4">
                <p className="mb-2 font-medium">
                  {i + 1}. {s.matn}
                </p>
                <ul className="mb-3 flex flex-col gap-1 text-sm">
                  {s.variantlar.map((v, vi) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <li
                      key={vi}
                      className={vi === s.togriJavobIndex ? "font-semibold text-primary" : "text-gray-600"}
                    >
                      {vi === s.togriJavobIndex ? "✓ " : "— "}
                      {v}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => tahrirlashniBoshlash(s)}
                    className="text-secondary hover:underline"
                  >
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    onClick={() => ochirish(s.id)}
                    className="text-red-500 hover:underline"
                  >
                    O&apos;chirish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
