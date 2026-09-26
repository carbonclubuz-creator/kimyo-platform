"use client";

// app/student/page.js
// O'quvchi asosiy sahifasi: mavzular kolleksiyasidan barcha mavzular ro'yxati,
// har birida shu o'quvchining shu mavzudagi ENG YUQORI foizi (oxirgi emas —
// 0-QISM, 10-band) ko'rsatiladi. Foiz tugallangan urinishlar orasidan real
// vaqtda hisoblanadi (alohida joyda saqlab yurish shart emas). Qolgan jonlar
// soni StudentHeader'da (yuqorida, har doim ko'rinadigan joyda) ko'rsatiladi.

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStudentAuth } from "@/app/student/AuthProvider";

export default function StudentDashboardPage() {
  const { user } = useStudentAuth();
  const [mavzular, setMavzular] = useState(null); // null = yuklanmoqda
  const [engYuqoriFoizlar, setEngYuqoriFoizlar] = useState({}); // { [mavzuId]: foiz }

  useEffect(() => {
    const q = query(collection(db, "mavzular"), orderBy("tartib"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMavzular(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Faqat bitta maydon bo'yicha ("studentId") — composite index shart emas;
    // mavzuId va holati bo'yicha filtrlash client tarafda bajariladi.
    const q = query(collection(db, "urinishlar"), where("studentId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const eng = {};
      snap.docs.forEach((d) => {
        const u = d.data();
        if (u.holati !== "tugallangan" || !u.jamiSavol) return;
        const foiz = Math.round((u.togriSoni / u.jamiSavol) * 100);
        if (!(u.mavzuId in eng) || foiz > eng[u.mavzuId]) {
          eng[u.mavzuId] = foiz;
        }
      });
      setEngYuqoriFoizlar(eng);
    });
    return unsubscribe;
  }, [user.uid]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Mavzular</h1>

      {mavzular === null && <p className="text-gray-400">Yuklanmoqda...</p>}

      {mavzular !== null && mavzular.length === 0 && (
        <p className="text-gray-500">Hali mavzular qo&apos;shilmagan.</p>
      )}

      {mavzular !== null && mavzular.length > 0 && (
        <ul className="flex flex-col gap-3">
          {mavzular.map((m) => {
            const foiz = engYuqoriFoizlar[m.id];
            return (
              <li key={m.id}>
                <Link
                  href={`/student/test/${m.id}`}
                  className="flex items-center justify-between rounded-xl2 border border-gray-200 bg-white px-5 py-4 transition hover:border-primary"
                >
                  <span className="font-semibold">{m.nomi}</span>
                  <span className={foiz != null ? "font-semibold text-primary" : "text-sm text-gray-400"}>
                    {foiz != null ? `${foiz}%` : "Hali ishlanmagan"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
