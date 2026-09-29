"use client";

// app/teacher/class/[id]/student/[studentId]/page.js
// Individual o'quvchi sahifasi (3-bosqich) — FAQAT ustoz uchun. Tepada:
// ism-familiya, login (nusxalash), parol (ko'z + nusxalash) va "Yangi parol
// yarat" (umumiy components/OquvchiAkkount.js — sinf jadvalidagi bilan bir xil
// mantiq). Pastda: xulosa va urinishlar tarixi jadvali (yangisi birinchi).
//
// Statistika tabining filtri URL query'da keladi (?davr=...&mavzuId=...):
// tarix shu filtr bo'yicha ko'rsatiladi, "Orqaga" esa sinf sahifasiga aynan
// shu filtr bilan qaytaradi (tab holati saqlanadi). Ma'lumotlar
// /api/teacher/stats/student dan olinadi — u boshqa ustoz o'quvchisi uchun 404
// qaytaradi. Bu sahifa o'quvchi UI'ida umuman yo'q.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import BackLink from "@/components/BackLink";
import {
  LoginQiymati,
  ParolQiymati,
  ParolYangilashTugmasi,
  useOquvchiAkkount,
} from "@/components/OquvchiAkkount";
import {
  davomiylikMatni,
  toshkentSanaKorinish,
  toshkentSoatDaqiqa,
} from "@/lib/vaqt";

const DAVR_NOMLARI = {
  haftalik: "Haftalik",
  bugungi: "Bugungi",
  kechagi: "Kechagi",
  umumiy: "Umumiy",
  mavzu: "Mavzu",
};

export default function OquvchiSahifasi({ params }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-6">
          <p className="text-gray-400">Yuklanmoqda...</p>
        </main>
      }
    >
      <OquvchiSahifasiIchki params={params} />
    </Suspense>
  );
}

function OquvchiSahifasiIchki({ params }) {
  const { id: classId, studentId } = params;
  const { user } = useTeacherAuth();
  const qidiruv = useSearchParams();

  const davrParam = qidiruv.get("davr") || "haftalik";
  const davr = DAVR_NOMLARI[davrParam] ? davrParam : "haftalik";
  const mavzuId = qidiruv.get("mavzuId") || "";

  const [malumot, setMalumot] = useState(undefined); // undefined = yuklanmoqda, null = topilmadi
  const [xato, setXato] = useState("");
  const [hisob, setHisob] = useState(null); // users hujjati (login, parol, qoshilishUsuli) — realtime

  // Akkount ma'lumotlari (login/parol): ustoz o'z o'quvchisining hujjatini
  // Firestore rules ruxsati bilan o'qiy oladi; parol yangilansa darhol
  // yangilanadi (sinf jadvalidagi kabi).
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "users", studentId),
      (snap) => {
        if (snap.exists()) setHisob({ id: snap.id, ...snap.data() });
      },
      () => {
        // Ruxsat yo'q (masalan o'quvchi sinfdan chiqarilgan) — API 404 qaytaradi.
      }
    );
    return unsubscribe;
  }, [studentId]);

  useEffect(() => {
    let bekor = false;

    async function yuklash() {
      setMalumot(undefined);
      setXato("");
      try {
        const idToken = await user.getIdToken();
        const p = new URLSearchParams({ classId, studentId, davr });
        if (davr === "mavzu" && mavzuId) p.set("mavzuId", mavzuId);
        const res = await fetch(`/api/teacher/stats/student?${p.toString()}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (bekor) return;
        if (res.status === 404) {
          setMalumot(null);
          return;
        }
        if (!res.ok) {
          setXato(data.error || "Xatolik yuz berdi");
          setMalumot(null);
          return;
        }
        setMalumot(data);
      } catch {
        if (!bekor) {
          setXato("Server bilan bog'lanishda xatolik");
          setMalumot(null);
        }
      }
    }

    yuklash();
    return () => {
      bekor = true;
    };
  }, [user, classId, studentId, davr, mavzuId]);

  // "Orqaga" — sinf sahifasining Statistika bo'limiga, shu filtr bilan.
  const orqagaParams = new URLSearchParams({ bolim: "statistika", davr });
  if (davr === "mavzu" && mavzuId) orqagaParams.set("mavzuId", mavzuId);
  const orqagaHref = `/teacher/class/${classId}?${orqagaParams.toString()}`;

  if (malumot === undefined) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <BackLink href={orqagaHref} />
        <p className="text-gray-400">Yuklanmoqda...</p>
      </main>
    );
  }

  if (malumot === null) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <BackLink href={orqagaHref} />
        <p className="text-red-500">{xato || "O'quvchi topilmadi."}</p>
      </main>
    );
  }

  const mavzuNomi = mavzuId ? malumot.mavzular.find((m) => m.id === mavzuId)?.nomi : null;
  const filtrMatni =
    davr === "mavzu" ? `Mavzu: ${mavzuNomi || "tanlanmagan"}` : `Davr: ${DAVR_NOMLARI[davr]}`;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <BackLink href={orqagaHref} />

      <AkkountBlok
        ism={malumot.oquvchi.ism}
        familiya={malumot.oquvchi.familiya}
        hisob={hisob}
        user={user}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Urinishlar tarixi</h2>
        <span className="rounded-full border border-secondary bg-secondary/10 px-3 py-1 text-sm font-medium text-secondary">
          {filtrMatni}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kartochka nomi="Urinishlar" qiymat={malumot.xulosa.urinishlarSoni} />
        <Kartochka nomi="Tugallangan" qiymat={malumot.xulosa.tugallanganSoni} />
        <Kartochka nomi="Tugallanmagan" qiymat={malumot.xulosa.tugallanmaganSoni} />
        {davr === "mavzu" && (
          <Kartochka
            nomi="Eng yuqori foiz"
            qiymat={malumot.xulosa.engYuqoriFoiz != null ? `${malumot.xulosa.engYuqoriFoiz}%` : "—"}
          />
        )}
      </div>

      {malumot.urinishlar.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-gray-300 py-10 text-center text-gray-500">
          Tanlangan filtr bo&apos;yicha urinish yo&apos;q.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 font-medium">Boshlangan</th>
                <th className="px-4 py-3 font-medium">Tugagan</th>
                <th className="px-4 py-3 font-medium">Davomiyligi</th>
                <th className="px-4 py-3 font-medium">Mavzu</th>
                <th className="px-4 py-3 font-medium">Holati</th>
                <th className="px-4 py-3 font-medium">To&apos;g&apos;ri / jami</th>
                <th className="px-4 py-3 font-medium">Foiz</th>
              </tr>
            </thead>
            <tbody>
              {malumot.urinishlar.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="whitespace-nowrap px-4 py-3">{toshkentSanaKorinish(u.boshlangan)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{toshkentSoatDaqiqa(u.boshlangan)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {u.tugallangan ? toshkentSoatDaqiqa(u.tugallangan) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {u.davomiylikSoniya != null ? davomiylikMatni(u.davomiylikSoniya) : "—"}
                  </td>
                  <td className="px-4 py-3">{u.mavzuNomi}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {u.holati === "tugallangan" ? (
                      <span className="font-medium text-primary-dark">Tugallangan</span>
                    ) : (
                      <span className="font-medium text-amber-600">Tugallanmagan</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.holati === "tugallangan" ? (
                      <span className="whitespace-nowrap">
                        {u.togriSoni} / {u.jamiSavol}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {u.javobBerilgan}/{u.jamiSavol} savolga javob berilgan
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {u.foiz != null ? `${u.foiz}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function AkkountBlok({ ism, familiya, hisob, user }) {
  // Hook shartsiz chaqirilishi uchun hisob bo'lmasa ham bo'sh obyekt uzatamiz.
  const student = hisob || { id: "", login: "", qoshilishUsuli: "hashteg" };
  const h = useOquvchiAkkount(student, user);

  return (
    <section className="mb-6 rounded-xl2 border border-gray-200 bg-white p-5">
      <h1 className="mb-4 text-2xl font-bold">
        {ism} {familiya}
      </h1>
      {!hisob ? (
        <p className="text-sm text-gray-400">Akkount ma&apos;lumotlari yuklanmoqda...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <p className="mb-1 text-xs text-gray-500">Login</p>
            <LoginQiymati student={hisob} h={h} />
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-500">Parol</p>
            <ParolQiymati student={hisob} h={h} />
          </div>
          <div>
            <ParolYangilashTugmasi student={hisob} h={h} />
          </div>
        </div>
      )}
      {h.resetError && <p className="mt-2 text-xs text-red-500">{h.resetError}</p>}
    </section>
  );
}

function Kartochka({ nomi, qiymat }) {
  return (
    <div className="rounded-xl2 border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{nomi}</p>
      <p className="text-xl font-bold text-secondary">{qiymat}</p>
    </div>
  );
}
