"use client";

// app/admin/questions/FaylOrqaliForma.js
// Admin — "Fayl orqali test qo'shish": mavzu nomi + Excel fayl yuklash.
// Fayl butunlay BRAUZERDA (xlsx kutubxonasi bilan) o'qiladi va
// tekshiriladi — serverga faqat tekshiruvdan o'tgan, tayyor savollar
// yuboriladi. Faylning o'zi hech qayerda saqlanmaydi (0-QISM: "fayli
// yo'q bo'lib ketaversin").

import { useState } from "react";
import * as XLSX from "xlsx";
import { useAdminAuth } from "@/app/admin/AdminAuthProvider";
import { excelQatorlariniQayta, USTUNLAR } from "@/lib/faylTestHelpers";

export default function FaylOrqaliForma() {
  const { fetchAdmin } = useAdminAuth();

  const [mavzuNomi, setMavzuNomi] = useState("");
  const [faylNomi, setFaylNomi] = useState("");
  const [savollar, setSavollar] = useState(null); // tekshiruvdan o'tgan, publish uchun tayyor
  const [xatolar, setXatolar] = useState([]);
  const [ochilmoqda, setOchilmoqda] = useState(false);
  const [joylanmoqda, setJoylanmoqda] = useState(false);
  const [natijaXabari, setNatijaXabari] = useState("");

  function holatniTozalash() {
    setSavollar(null);
    setXatolar([]);
    setNatijaXabari("");
  }

  async function faylTanlandi(e) {
    const fayl = e.target.files?.[0];
    if (!fayl) return;
    holatniTozalash();
    setFaylNomi(fayl.name);
    setOchilmoqda(true);
    try {
      const buffer = await fayl.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const birinchiSheet = workbook.SheetNames[0];
      const qatorlar = XLSX.utils.sheet_to_json(workbook.Sheets[birinchiSheet], {
        header: 1,
        defval: "",
      });
      const natija = excelQatorlariniQayta(qatorlar);
      setSavollar(natija.savollar);
      setXatolar(natija.xatolar);
    } catch {
      setXatolar(["Faylni o'qib bo'lmadi — .xlsx formatida ekanini tekshiring"]);
    } finally {
      setOchilmoqda(false);
      // Xuddi shu faylni qayta tanlasa ham onChange ishlashi uchun.
      e.target.value = "";
    }
  }

  async function publishQilish() {
    if (!mumkinPublish) return;
    setJoylanmoqda(true);
    setNatijaXabari("");
    try {
      const res = await fetchAdmin("/api/admin/savollar/fayl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mavzuNomi: mavzuNomi.trim(), savollar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXatolar([data.error || "Xatolik yuz berdi"]);
        return;
      }
      setNatijaXabari(`"${data.mavzuNomi}" mavzusiga ${data.soni} ta savol muvaffaqiyatli qo'shildi.`);
      setSavollar(null);
      setFaylNomi("");
    } catch {
      setXatolar(["Server bilan bog'lanishda xatolik"]);
    } finally {
      setJoylanmoqda(false);
    }
  }

  const mumkinPublish = Boolean(
    mavzuNomi.trim() && savollar && savollar.length > 0 && xatolar.length === 0
  );

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl2 border border-gray-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-600">Mavzu nomi</label>
        <input
          value={mavzuNomi}
          onChange={(e) => setMavzuNomi(e.target.value)}
          placeholder="Masalan: Mol tushunchasi"
          className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-400">
          Shu nomli mavzu allaqachon mavjud bo&apos;lsa, uning ESKI savollari butunlay yangilari
          bilan almashtiriladi.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-600">Excel fayl (.xlsx)</label>
        <input
          type="file"
          accept=".xlsx"
          onChange={faylTanlandi}
          className="w-full rounded-xl2 border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-400">
          1-qator sarlavha uchun ({USTUNLAR.join(", ")}), 2-qatordan boshlab har bir savol — bitta
          qator: A={USTUNLAR[0]}, B={USTUNLAR[1]}, C/D/E={USTUNLAR[2]}/{USTUNLAR[3]}/{USTUNLAR[4]}.
        </p>
      </div>

      {ochilmoqda && <p className="text-sm text-gray-400">Fayl tekshirilmoqda...</p>}

      {xatolar.length > 0 && (
        <div className="rounded-xl2 border border-red-200 bg-red-50 p-3">
          <p className="mb-1 text-sm font-semibold text-red-600">
            {xatolar.length} ta xatolik topildi — avval faylda tuzatib, qayta yuklang:
          </p>
          <ul className="max-h-48 list-disc overflow-y-auto pl-5 text-sm text-red-600">
            {xatolar.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {savollar && savollar.length > 0 && xatolar.length === 0 && (
        <div className="rounded-xl2 border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-semibold text-green-700">
            ✓ {faylNomi} tayyor — {savollar.length} ta savol tekshiruvdan muvaffaqiyatli o&apos;tdi.
          </p>
          <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-gray-600">
            {savollar.slice(0, 5).map((s, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={i}>
                {i + 1}. {s.matn}
              </li>
            ))}
            {savollar.length > 5 && <li>... va yana {savollar.length - 5} ta</li>}
          </ul>
        </div>
      )}

      {natijaXabari && <p className="text-sm font-semibold text-primary">{natijaXabari}</p>}

      <button
        type="button"
        onClick={publishQilish}
        disabled={!mumkinPublish || joylanmoqda}
        className="self-start rounded-xl2 bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary-dark disabled:opacity-40"
      >
        {joylanmoqda ? "Joylanmoqda..." : "Publish"}
      </button>
    </div>
  );
}
