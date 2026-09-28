"use client";

// app/student/rating/page.js
// O'quvchi Reyting sahifasi (0-QISM 6.5-band): Global/Sinf ikki tab,
// ichida Haftalik(default)/Bugungi/Kechagi/Umumiy + Mavzular bo'limlari.
// Boshqa o'quvchi haqida faqat ism + ball/pozitsiya ko'rinadi — shaxsiy
// tafsilotlar (urinishlar, vaqt) hech qachon qaytarilmaydi, buni server
// (/api/student/rating) ta'minlaydi.

import { useEffect, useState } from "react";
import { useStudentAuth } from "@/app/student/AuthProvider";

const SCOPE_TABLARI = [
  { key: "global", label: "Global" },
  { key: "sinf", label: "Sinf" },
];

const DAVR_TABLARI = [
  { key: "haftalik", label: "Haftalik" },
  { key: "bugungi", label: "Bugungi" },
  { key: "kechagi", label: "Kechagi" },
  { key: "umumiy", label: "Umumiy" },
  { key: "mavzu", label: "Mavzular" },
];

export default function RatingPage() {
  const { user } = useStudentAuth();

  const [scope, setScope] = useState("global");
  const [davr, setDavr] = useState("haftalik");
  const [mavzuId, setMavzuId] = useState("");

  const [mavzular, setMavzular] = useState([]);
  const [royxat, setRoyxat] = useState(null); // null = yuklanmoqda
  const [birlik, setBirlik] = useState("ball");
  const [sinfYoq, setSinfYoq] = useState(false);
  const [xato, setXato] = useState("");

  useEffect(() => {
    let bekor = false;

    async function yuklash() {
      setRoyxat(null);
      setSinfYoq(false);
      setXato("");
      try {
        const idToken = await user.getIdToken();
        const params = new URLSearchParams({ scope, davr });
        if (davr === "mavzu" && mavzuId) params.set("mavzuId", mavzuId);

        const res = await fetch(`/api/student/rating?${params.toString()}`, {
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

        if (data.reason === "no-class") {
          setSinfYoq(true);
          setRoyxat([]);
          return;
        }

        // Mavzular tabiga birinchi marta o'tilganda, ro'yxatdan birinchi
        // mavzuni avtomatik tanlab, natijani darhol so'raymiz.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, scope, davr, mavzuId]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Reyting</h1>

      <div className="mb-4 flex gap-2">
        {SCOPE_TABLARI.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setScope(t.key)}
            className={`rounded-xl2 px-4 py-2 text-sm font-semibold transition ${
              scope === t.key
                ? "bg-primary text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {DAVR_TABLARI.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDavr(d.key)}
            className={`rounded-xl2 px-3 py-1.5 text-sm transition ${
              davr === d.key
                ? "bg-secondary text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-100"
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
          className="mb-4 w-full rounded-xl2 border border-gray-300 px-3 py-2"
        >
          {mavzular.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nomi}
            </option>
          ))}
        </select>
      )}

      {xato && <p className="mb-4 text-sm text-red-500">{xato}</p>}

      {sinfYoq && (
        <p className="text-gray-500">
          Sizda hozircha sinf yo&apos;q — sinfga a&apos;zo bo&apos;lganingizda shu yerda
          sinfdoshlaringiz reytingi ko&apos;rinadi.
        </p>
      )}

      {!sinfYoq && royxat === null && !xato && (
        <p className="text-gray-400">Yuklanmoqda...</p>
      )}

      {!sinfYoq && royxat !== null && royxat.length === 0 && (
        <p className="text-gray-500">Hali natijalar yo&apos;q.</p>
      )}

      {!sinfYoq && royxat !== null && royxat.length > 0 && (
        <ul className="flex flex-col gap-2">
          {royxat.map((r) => (
            <li
              key={r.studentId}
              className={`flex items-center justify-between rounded-xl2 border px-4 py-3 ${
                r.isSelf ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="w-6 text-sm font-semibold text-gray-400">{r.pozitsiya}</span>
                <span className="font-medium">
                  {r.ism} {r.familiya}
                  {r.isSelf && <span className="ml-1 text-xs text-primary">(Siz)</span>}
                </span>
              </span>
              <span className="font-semibold text-primary">
                {r.ball}
                {birlik === "%" ? "%" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
