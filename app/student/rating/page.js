"use client";

// app/student/rating/page.js
// O'quvchi Reyting sahifasi (0-QISM 6.5-band): Global/Sinf ikki tab,
// ichida Haftalik(default)/Bugungi/Kechagi/Umumiy + Mavzular bo'limlari.
// Boshqa o'quvchi haqida faqat ism + ball/pozitsiya ko'rinadi — shaxsiy
// tafsilotlar (urinishlar, vaqt) hech qachon qaytarilmaydi, buni server
// (/api/student/rating) ta'minlaydi.

import { useEffect, useState } from "react";
import { useStudentAuth } from "@/app/student/AuthProvider";
import BackLink from "@/components/BackLink";

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

// Global va Sinf o'z rangiga ega (Global — yashil, Sinf — ko'k). Ostidagi
// Haftalik/Bugungi/... bo'limlar shu rangdagi ramka ichida turadi — shunda
// ular qaysi tabga (Global yoki Sinf) tegishli ekani ko'rinib turadi.
const SCOPE_USLUB = {
  global: {
    tab: "bg-primary text-white",
    panel: "border-primary",
    davrFaol: "border-primary bg-primary/10 font-semibold text-primary-dark",
    tanlov: "focus:border-primary",
  },
  sinf: {
    tab: "bg-secondary text-white",
    panel: "border-secondary",
    davrFaol: "border-secondary bg-secondary/10 font-semibold text-secondary",
    tanlov: "focus:border-secondary",
  },
};

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

  const uslub = SCOPE_USLUB[scope];

  return (
    <main className="mx-auto max-w-2xl p-6">
      <BackLink href="/student" />
      <h1 className="mb-6 text-2xl font-bold">Reyting</h1>

      {/* Bosh tablar: Global | Sinf */}
      <div className="grid grid-cols-2 gap-1" role="tablist" aria-label="Reyting turi">
        {SCOPE_TABLARI.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={scope === t.key}
            onClick={() => setScope(t.key)}
            className={`rounded-t-xl2 px-4 py-3 text-base font-bold transition ${
              scope === t.key
                ? SCOPE_USLUB[t.key].tab
                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tanlangan tabning rangidagi panel: davr bo'limlari va ro'yxat shu ichida */}
      <div className={`rounded-b-xl2 border-2 bg-white p-4 ${uslub.panel}`}>
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Davr">
          {DAVR_TABLARI.map((d) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={davr === d.key}
              onClick={() => setDavr(d.key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                davr === d.key
                  ? uslub.davrFaol
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
            className={`mb-4 w-full rounded-xl2 border border-gray-300 px-3 py-2 outline-none ${uslub.tanlov}`}
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
      </div>
    </main>
  );
}
