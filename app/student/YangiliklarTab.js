"use client";

// app/student/YangiliklarTab.js
// O'quvchi — "Yangiliklar" tabi (faqat ko'rish). Birinchi marta ochilganda BIR marta
// yuklanadi (lazy; ota sahifa uni shu paytgacha mount qilmaydi), avtomatik takroriy
// so'rov (polling) yo'q. Eng yangisi tepada, 20 tadan, pastda "Yana yuklash".
// Nima ko'rinishini server hal qiladi (sinf o'quvchining o'z hujjatidan olinadi).

import { useEffect, useState } from "react";
import { useStudentAuth } from "@/app/student/AuthProvider";
import { toshkentSanaVaqt } from "@/lib/vaqt";
import { tahrirlanganBelgisi } from "@/lib/yangilikHelpers";

export default function YangiliklarTab() {
  const { user } = useStudentAuth();
  const [royxat, setRoyxat] = useState(null); // null = yuklanmoqda
  const [kursor, setKursor] = useState(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function yuklash(kursorQiymati) {
    setXato("");
    setYuklanmoqda(true);
    try {
      const idToken = await user.getIdToken();
      const url = kursorQiymati
        ? `/api/student/yangiliklar?kursor=${encodeURIComponent(kursorQiymati)}`
        : "/api/student/yangiliklar";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setRoyxat((oldingi) => {
        const eski = kursorQiymati ? oldingi || [] : [];
        const idlar = new Set(eski.map((x) => x.id));
        return [...eski, ...(data.yangiliklar || []).filter((x) => !idlar.has(x.id))];
      });
      setKursor(data.keyingiKursor || null);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYuklanmoqda(false);
    }
  }

  useEffect(() => {
    yuklash(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {xato && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-500">{xato}</p>
          <button
            type="button"
            onClick={() => yuklash(royxat === null ? null : kursor)}
            className="rounded-xl2 border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Qayta urinish
          </button>
        </div>
      )}
      {royxat === null && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}
      {royxat !== null && royxat.length === 0 && (
        <p className="text-gray-500">Hozircha yangilik yo&apos;q.</p>
      )}

      <div className="flex flex-col gap-4">
        {royxat?.map((y) => {
          const belgi = tahrirlanganBelgisi(y.tahrirlangan);
          return (
            <div key={y.id} className="rounded-xl2 border border-gray-200 bg-white p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2.5 py-0.5 font-bold ${
                    y.tur === "admin" ? "bg-primary text-white" : "bg-secondary/15 text-secondary"
                  }`}
                >
                  {y.muallif}
                </span>
                <span className="ml-auto text-gray-400">
                  {toshkentSanaVaqt(y.sana)}
                  {belgi && <span className="ml-2 italic">· {belgi}</span>}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-gray-800">{y.matn}</p>
            </div>
          );
        })}
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
    </div>
  );
}
