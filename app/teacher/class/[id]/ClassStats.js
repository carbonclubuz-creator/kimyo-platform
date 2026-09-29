"use client";

// app/teacher/class/[id]/ClassStats.js
// Sinf ichi sahifasidagi "Statistika" bo'limi (3-bosqich): Haftalik (default) /
// Bugungi / Kechagi / Umumiy / Mavzular — Reyting sahifasi
// (app/student/rating/page.js) bilan bir xil tab tuzilmasi va uslubi, faqat
// ustoz uchun `secondary` (ko'k) ramka bilan. Test ishlamagan o'quvchi ham
// 0 ball bilan pastda turadi (buni server ta'minlaydi). Ism bosilsa —
// individual o'quvchi sahifasi, tanlangan tab filtri URL query orqali
// uzatiladi (qaytganda tab holati saqlanadi).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import { toshkentSanaVaqt } from "@/lib/vaqt";

const DAVR_TABLARI = [
  { key: "haftalik", label: "Haftalik" },
  { key: "bugungi", label: "Bugungi" },
  { key: "kechagi", label: "Kechagi" },
  { key: "umumiy", label: "Umumiy" },
  { key: "mavzu", label: "Mavzular" },
];

/** Individual sahifaga havola (tab filtrini query sifatida olib ketadi). */
export function oquvchiHavolasi(classId, studentId, davr, mavzuId) {
  const params = new URLSearchParams({ davr });
  if (davr === "mavzu" && mavzuId) params.set("mavzuId", mavzuId);
  return `/teacher/class/${classId}/student/${studentId}?${params.toString()}`;
}

export default function ClassStats({ classId, boshlangichDavr, boshlangichMavzuId, onOzgarish }) {
  const { user } = useTeacherAuth();

  const [davr, setDavr] = useState(boshlangichDavr || "haftalik");
  const [mavzuId, setMavzuId] = useState(boshlangichMavzuId || "");
  const [mavzular, setMavzular] = useState([]);
  const [royxat, setRoyxat] = useState(null); // null = yuklanmoqda
  const [birlik, setBirlik] = useState("ball");
  const [xato, setXato] = useState("");

  // Tab/mavzu o'zgarganda tashqariga (URL'ga) xabar beramiz.
  useEffect(() => {
    if (onOzgarish) onOzgarish(davr, mavzuId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [davr, mavzuId]);

  useEffect(() => {
    let bekor = false;

    async function yuklash() {
      setRoyxat(null);
      setXato("");
      try {
        const idToken = await user.getIdToken();
        const params = new URLSearchParams({ classId, davr });
        if (davr === "mavzu" && mavzuId) params.set("mavzuId", mavzuId);

        const res = await fetch(`/api/teacher/stats?${params.toString()}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (bekor) return;

        if (!res.ok) {
          setXato(data.error || "Xatolik yuz berdi");
          return;
        }

        setMavzular(data.mavzular || []);
        setBirlik(data.birlik || "ball");

        // Mavzular tabiga birinchi marta o'tilganda birinchi mavzuni tanlaymiz
        // (Reyting sahifasidagi xatti-harakat bilan bir xil).
        if (davr === "mavzu" && !mavzuId && data.mavzular?.length) {
          setMavzuId(data.mavzular[0].id);
          return;
        }

        setRoyxat(data.royxat || []);
      } catch {
        if (!bekor) setXato("Server bilan bog'lanishda xatolik");
      }
    }

    yuklash();
    return () => {
      bekor = true;
    };
  }, [user, classId, davr, mavzuId]);

  function davrTanla(yangi) {
    setDavr(yangi);
    // Mavzu ro'yxati allaqachon ma'lum bo'lsa, tab bosilgan zahoti tanlaymiz —
    // ortiqcha so'rovsiz.
    if (yangi === "mavzu" && !mavzuId && mavzular.length) setMavzuId(mavzular[0].id);
  }

  return (
    <div className="rounded-xl2 border-2 border-secondary bg-white p-4">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Statistika davri">
        {DAVR_TABLARI.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={davr === d.key}
            onClick={() => davrTanla(d.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              davr === d.key
                ? "border-secondary bg-secondary/10 font-semibold text-secondary"
                : "border-gray-200 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {davr === "mavzu" && mavzular.length > 0 && (
        <select
          value={mavzuId}
          onChange={(e) => setMavzuId(e.target.value)}
          className="mb-4 w-full rounded-xl2 border border-gray-300 px-3 py-2 outline-none focus:border-secondary"
        >
          {mavzular.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nomi}
            </option>
          ))}
        </select>
      )}

      {xato && <p className="mb-4 text-sm text-red-500">{xato}</p>}

      {royxat === null && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}

      {royxat !== null && royxat.length === 0 && (
        <p className="text-gray-500">Bu sinfda hali o&apos;quvchi yo&apos;q.</p>
      )}

      {royxat !== null && royxat.length > 0 && (
        <ul className="flex flex-col gap-2">
          {royxat.map((r) => (
            <li key={r.studentId}>
              <Link
                href={oquvchiHavolasi(classId, r.studentId, davr, mavzuId)}
                className="block rounded-xl2 border border-gray-200 bg-white px-4 py-3 transition hover:border-secondary"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-sm font-semibold text-gray-400">
                      {r.pozitsiya}
                    </span>
                    <span className="truncate font-medium">
                      {r.ism} {r.familiya}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-secondary">
                    {r.ball}
                    {birlik === "%" ? "%" : ""}
                  </span>
                </div>
                <p className="mt-1 pl-9 text-xs text-gray-400">
                  {r.urinishlarSoni} urinish · {r.tugallanganSoni} tugallangan ·{" "}
                  {r.tugallanmaganSoni} tugallanmagan · oxirgi faollik:{" "}
                  {r.oxirgiFaoliyat ? toshkentSanaVaqt(r.oxirgiFaoliyat) : "—"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
