"use client";

// app/student/page.js
// O'quvchi asosiy sahifasi: mavzular ro'yxati, har birida shu o'quvchining
// ENG YUQORI foizi (0-QISM 10-band). Endi to'g'ridan-to'g'ri Firestore
// o'rniga /api/student/dashboard'dan olinadi (server, Admin SDK) — chunki
// urinishlar kolleksiyasi endi faqat serverdan o'qiladi/yoziladi.
// "Mavzular" yonida "Yangiliklar" tabi (3-BOSQICH): birinchi kirganda Mavzular ochiq;
// Yangiliklar so'rovi faqat tabga BIRINCHI marta bosilganda yuklanadi (lazy).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStudentAuth } from "@/app/student/AuthProvider";
import YangiliklarTab from "@/app/student/YangiliklarTab";

export default function StudentDashboardPage() {
  const { user, bonus } = useStudentAuth();
  const [mavzular, setMavzular] = useState(null); // null = yuklanmoqda
  const [xato, setXato] = useState("");
  const [tab, setTab] = useState("mavzular");
  const [yangiliklarOchilgan, setYangiliklarOchilgan] = useState(false);

  function tabniTanla(nomi) {
    setTab(nomi);
    if (nomi === "yangiliklar") setYangiliklarOchilgan(true);
  }

  const tabClass = (faol) =>
    `rounded-xl2 px-4 py-2 text-sm font-semibold ${
      faol ? "bg-primary text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-100"
    }`;

  useEffect(() => {
    let bekor = false;

    async function yuklash() {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/student/dashboard", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (bekor) return;
        if (!res.ok) {
          setXato(data.error || "Xatolik yuz berdi");
          return;
        }
        setMavzular(data.mavzular || []);
      } catch {
        if (!bekor) setXato("Server bilan bog'lanishda xatolik");
      }
    }

    yuklash();
    return () => {
      bekor = true;
    };
  }, [user]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* Admin yoqqan bonus jon e'loni — ixcham, mavzular ro'yxatini itarib yubormaydi */}
      {bonus?.faol && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl2 border border-primary bg-primary/10 px-4 py-2 text-sm"
          role="status"
        >
          <span aria-hidden="true">🎉</span>
          <p className="min-w-0 text-primary-dark">
            <span className="font-bold">Bugun +{bonus.soni} bonus jon!</span>
            {bonus.xabar && <span className="ml-1 text-gray-700">{bonus.xabar}</span>}
          </p>
        </div>
      )}

      <h1 className="sr-only">Mavzular va yangiliklar</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => tabniTanla("mavzular")} className={tabClass(tab === "mavzular")}>
          Mavzular
        </button>
        <button
          type="button"
          onClick={() => tabniTanla("yangiliklar")}
          className={tabClass(tab === "yangiliklar")}
        >
          Yangiliklar
        </button>
      </div>

      <div className={tab === "mavzular" ? "" : "hidden"}>
      {xato && <p className="mb-4 text-sm text-red-500">{xato}</p>}

      {mavzular === null && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}

      {mavzular !== null && mavzular.length === 0 && (
        <p className="text-gray-500">Hali mavzular qo&apos;shilmagan.</p>
      )}

      {mavzular !== null && mavzular.length > 0 && (
        <ul className="flex flex-col gap-3">
          {mavzular.map((m) => (
            <li key={m.id}>
              <Link
                href={`/student/test/${m.id}`}
                className="flex items-center justify-between rounded-xl2 border border-gray-200 bg-white px-5 py-4 transition hover:border-primary"
              >
                <span className="font-semibold">{m.nomi}</span>
                <span
                  className={
                    m.engYuqoriFoiz != null ? "font-semibold text-primary" : "text-sm text-gray-400"
                  }
                >
                  {m.engYuqoriFoiz != null ? `${m.engYuqoriFoiz}%` : "Hali ishlanmagan"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>

      {yangiliklarOchilgan && (
        <div className={tab === "yangiliklar" ? "" : "hidden"}>
          <YangiliklarTab />
        </div>
      )}
    </main>
  );
}
