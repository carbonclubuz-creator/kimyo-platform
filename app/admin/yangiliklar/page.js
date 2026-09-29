"use client";

// app/admin/yangiliklar/page.js
// Admin — Yangiliklar. Yuqorida yangi post formasi (matn + kimlarga: ustozlarga /
// mustaqil o'quvchilarga), pastda adminning postlari (eng yangisi birinchi, 20 tadan,
// "Yana yuklash"). Sahifa ochilganda BIR marta yuklanadi (polling yo'q); yaratish,
// tahrirlash va o'chirishdan keyin ro'yxat qayta so'ralmaydi — javob bilan
// mahalliy yangilanadi (Firestore o'qishlari tejaladi).

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { toshkentSanaVaqt } from "@/lib/vaqt";
import { YANGILIK_MAX_UZUNLIK, tahrirlanganBelgisi } from "@/lib/yangilikHelpers";
import { useAdminAuth } from "../AdminAuthProvider";

export default function AdminYangiliklarPage() {
  const { fetchAdmin } = useAdminAuth();

  const [royxat, setRoyxat] = useState(null); // null = yuklanmoqda
  const [kursor, setKursor] = useState(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [royxatXato, setRoyxatXato] = useState("");

  const [matn, setMatn] = useState("");
  const [ustozlarga, setUstozlarga] = useState(true);
  const [mustaqilga, setMustaqilga] = useState(true);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [formaXato, setFormaXato] = useState("");

  useEffect(() => {
    yuklash(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function yuklash(kursorQiymati) {
    setRoyxatXato("");
    setYuklanmoqda(true);
    try {
      const url = kursorQiymati
        ? `/api/admin/yangiliklar?kursor=${encodeURIComponent(kursorQiymati)}`
        : "/api/admin/yangiliklar";
      const res = await fetchAdmin(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRoyxatXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setRoyxat((oldingi) => {
        const eski = kursorQiymati ? oldingi || [] : [];
        const idlar = new Set(eski.map((x) => x.id));
        return [...eski, ...(data.yangiliklar || []).filter((x) => !idlar.has(x.id))];
      });
      setKursor(data.keyingiKursor || null);
    } catch {
      setRoyxatXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYuklanmoqda(false);
    }
  }

  async function elonQilish(e) {
    e.preventDefault();
    setFormaXato("");
    if (!matn.trim()) {
      setFormaXato("Yangilik matnini yozing");
      return;
    }
    if (!ustozlarga && !mustaqilga) {
      setFormaXato("Kamida bitta auditoriyani tanlang");
      return;
    }
    setYuborilmoqda(true);
    try {
      const res = await fetchAdmin("/api/admin/yangiliklar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matn, ustozlarga, mustaqilga }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormaXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setRoyxat((oldingi) => [data.yangilik, ...(oldingi || [])]);
      setMatn("");
    } catch {
      setFormaXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYuborilmoqda(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Yangiliklar</h1>

      <form onSubmit={elonQilish} className="mb-8 rounded-xl2 border border-gray-200 bg-white p-5">
        <textarea
          value={matn}
          onChange={(e) => setMatn(e.target.value)}
          maxLength={YANGILIK_MAX_UZUNLIK}
          rows={5}
          placeholder="Yangilik matni..."
          className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {matn.length} / {YANGILIK_MAX_UZUNLIK}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-semibold text-gray-600">Kimlarga:</span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ustozlarga}
              onChange={(e) => setUstozlarga(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Ustozlarga
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mustaqilga}
              onChange={(e) => setMustaqilga(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Mustaqil o&apos;quvchilarga
          </label>
        </div>

        {formaXato && <p className="mt-3 text-sm text-red-500">{formaXato}</p>}
        <button
          type="submit"
          disabled={yuborilmoqda}
          className="mt-4 rounded-xl2 bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {yuborilmoqda ? "Yuborilmoqda..." : "E'lon qilish"}
        </button>
      </form>

      {royxatXato && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-500">{royxatXato}</p>
          <button
            type="button"
            onClick={() => yuklash(royxat === null ? null : kursor)}
            className="rounded-xl2 border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Qayta urinish
          </button>
        </div>
      )}
      {royxat === null && !royxatXato && <p className="text-gray-400">Yuklanmoqda...</p>}
      {royxat !== null && royxat.length === 0 && (
        <p className="text-gray-500">Hozircha yangilik yo&apos;q.</p>
      )}

      <div className="flex flex-col gap-4">
        {royxat?.map((y) => (
          <YangilikKarta
            key={y.id}
            yangilik={y}
            onYangilandi={(yangi) =>
              setRoyxat((oldingi) => oldingi.map((x) => (x.id === yangi.id ? yangi : x)))
            }
            onOchirildi={(id) => setRoyxat((oldingi) => oldingi.filter((x) => x.id !== id))}
          />
        ))}
      </div>

      {kursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={yuklanmoqda}
            onClick={() => yuklash(kursor)}
            className="rounded-xl2 border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-60"
          >
            {yuklanmoqda ? "Yuklanmoqda..." : "Yana yuklash"}
          </button>
        </div>
      )}
    </main>
  );
}

function YangilikKarta({ yangilik, onYangilandi, onOchirildi }) {
  const { fetchAdmin } = useAdminAuth();
  const [tahrirlash, setTahrirlash] = useState(false);
  const [matn, setMatn] = useState(yangilik.matn);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [ochirishTasdiq, setOchirishTasdiq] = useState(false);
  const [ochirilmoqda, setOchirilmoqda] = useState(false);

  const belgi = tahrirlanganBelgisi(yangilik.tahrirlangan);

  function tahrirniBoshlash() {
    setMatn(yangilik.matn);
    setXato("");
    setTahrirlash(true);
  }

  async function saqlash() {
    setXato("");
    if (!matn.trim()) {
      setXato("Yangilik matnini yozing");
      return;
    }
    setSaqlanmoqda(true);
    try {
      const res = await fetchAdmin(`/api/admin/yangiliklar/${yangilik.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      onYangilandi(data.yangilik);
      setTahrirlash(false);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setSaqlanmoqda(false);
    }
  }

  async function ochirish() {
    setOchirilmoqda(true);
    setXato("");
    try {
      const res = await fetchAdmin(`/api/admin/yangiliklar/${yangilik.id}`, { method: "DELETE" });
      // 404 — allaqachon o'chirilgan: ro'yxatdan olib tashlaymiz.
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        setXato(data.error || "Xatolik yuz berdi");
        setOchirishTasdiq(false);
        return;
      }
      onOchirildi(yangilik.id);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
      setOchirishTasdiq(false);
    } finally {
      setOchirilmoqda(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-gray-200 bg-white p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {yangilik.ustozlarga && (
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-semibold text-primary-dark">
            Ustozlarga
          </span>
        )}
        {yangilik.mustaqilga && (
          <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 font-semibold text-secondary">
            Mustaqil o&apos;quvchilarga
          </span>
        )}
        <span className="ml-auto text-gray-400">
          {yangilik.yaratilgan ? toshkentSanaVaqt(yangilik.yaratilgan) : ""}
          {belgi && <span className="ml-2 italic">· {belgi}</span>}
        </span>
      </div>

      {tahrirlash ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={matn}
            onChange={(e) => setMatn(e.target.value)}
            maxLength={YANGILIK_MAX_UZUNLIK}
            rows={5}
            className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
          />
          <p className="text-right text-xs text-gray-400">
            {matn.length} / {YANGILIK_MAX_UZUNLIK}
          </p>
          {xato && <p className="text-sm text-red-500">{xato}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saqlanmoqda}
              onClick={saqlash}
              className="rounded-xl2 bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saqlanmoqda ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              type="button"
              onClick={() => setTahrirlash(false)}
              className="rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap break-words text-gray-800">{yangilik.matn}</p>
          {xato && <p className="mt-2 text-sm text-red-500">{xato}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={tahrirniBoshlash}
              className="rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Tahrirlash
            </button>
            <button
              type="button"
              onClick={() => setOchirishTasdiq(true)}
              className="rounded-xl2 border border-red-300 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50"
            >
              O&apos;chirish
            </button>
          </div>
        </>
      )}

      {ochirishTasdiq && (
        <Modal title="Ishonchingiz komilmi?" onClose={() => setOchirishTasdiq(false)}>
          <p className="mb-4 text-sm text-gray-600">
            Yangilik hamma joydan o&apos;chadi: ustozlar sinflariga yuborgan bo&apos;lsa, o&apos;quvchilar ham
            uni ko&apos;rmaydi. Buni qaytarib bo&apos;lmaydi.
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
