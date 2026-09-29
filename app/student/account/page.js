"use client";

// app/student/account/page.js
// O'quvchi Akkount sahifasi (0-QISM 11-band, 5-PROMPT):
// Ism, Familiya, umumiy bali ko'rsatiladi. "Tahrirlash" — Ism/Familiya/Viloyat
// o'zgartirish formasi (login HECH QACHON o'zgarmaydi — 0-QISM 5-band).
// "Chiqish" faqat Tahrirlash ichida (eng pastda, tasdiq bilan).

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStudentAuth } from "@/app/student/AuthProvider";
import { validateIsmFamiliya } from "@/lib/accountHelpers";
import { VILOYATLAR } from "@/lib/viloyatlar";
import BackLink from "@/components/BackLink";
import Modal from "@/components/Modal";

export default function StudentAccountPage() {
  const { user, userData, refreshUserData, logout } = useStudentAuth();

  // "Umumiy ball" endi Firestore'dagi xom maydondan emas, serverda
  // Reyting bilan bir xil qoida bo'yicha (har mavzudan faqat eng yuqori
  // natija) hisoblangan holda /api/student/dashboard'dan olinadi.
  const [umumiyBall, setUmumiyBall] = useState(null);

  useEffect(() => {
    let bekor = false;
    async function yuklash() {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/student/dashboard", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!bekor && res.ok) setUmumiyBall(data.umumiyBall ?? 0);
      } catch {
        // jim — pastda 0 ko'rsatib turiladi
      }
    }
    yuklash();
    return () => {
      bekor = true;
    };
  }, [user]);

  const [tahrirlash, setTahrirlash] = useState(false);
  const [ism, setIsm] = useState("");
  const [familiya, setFamiliya] = useState("");
  const [viloyat, setViloyat] = useState(VILOYATLAR[0]);
  const [tuman, setTuman] = useState("");
  const [xato, setXato] = useState("");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [chiqishTasdiq, setChiqishTasdiq] = useState(false);

  function tahrirlashniOchish() {
    setIsm(userData?.ism || "");
    setFamiliya(userData?.familiya || "");
    setViloyat(userData?.viloyat || VILOYATLAR[0]);
    setTuman(userData?.tuman || "");
    setXato("");
    setTahrirlash(true);
  }

  async function saqlash(e) {
    e.preventDefault();

    const ismNatija = validateIsmFamiliya(ism);
    if (!ismNatija.valid) {
      setXato(`Ism: ${ismNatija.error}`);
      return;
    }
    const familiyaNatija = validateIsmFamiliya(familiya);
    if (!familiyaNatija.valid) {
      setXato(`Familiya: ${familiyaNatija.error}`);
      return;
    }

    setSaqlanmoqda(true);
    setXato("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ism: ismNatija.value,
        familiya: familiyaNatija.value,
        viloyat,
        tuman: tuman.trim(),
      });
      await refreshUserData();
      setTahrirlash(false);
    } catch {
      setXato("Saqlashda xato yuz berdi, qayta urinib ko'ring.");
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <BackLink href="/student" />
      <h1 className="mb-6 text-2xl font-bold">Akkount</h1>

      {!tahrirlash && (
        <div className="rounded-xl2 border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-400">Ism Familiya</p>
          <p className="mb-4 text-lg font-semibold">
            {userData?.ism} {userData?.familiya}
          </p>

          <p className="text-sm text-gray-400">Umumiy ball</p>
          <p className="mb-4 text-lg font-semibold text-primary">{umumiyBall ?? 0}</p>

          <p className="text-sm text-gray-400">Viloyat</p>
          <p className="mb-4 text-lg font-semibold">{userData?.viloyat}</p>

          <p className="text-sm text-gray-400">Tuman</p>
          <p className="mb-4 text-lg font-semibold">{userData?.tuman}</p>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={tahrirlashniOchish}
              className="rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
            >
              Tahrirlash
            </button>
          </div>
        </div>
      )}

      {tahrirlash && (
        <form
          onSubmit={saqlash}
          className="flex flex-col gap-4 rounded-xl2 border border-gray-200 bg-white p-5"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Ism</label>
            <input
              value={ism}
              onChange={(e) => setIsm(e.target.value)}
              className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Familiya</label>
            <input
              value={familiya}
              onChange={(e) => setFamiliya(e.target.value)}
              className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Viloyat</label>
            <select
              value={viloyat}
              onChange={(e) => setViloyat(e.target.value)}
              className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
            >
              {VILOYATLAR.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Tuman</label>
            <input
              value={tuman}
              onChange={(e) => setTuman(e.target.value)}
              className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
            />
          </div>

          {xato && <p className="text-sm text-red-500">{xato}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saqlanmoqda}
              className="rounded-xl2 bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saqlanmoqda ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              type="button"
              onClick={() => setTahrirlash(false)}
              className="rounded-xl2 border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-100"
            >
              Bekor qilish
            </button>
          </div>
        </form>
      )}

      {/* "Chiqish" ataylab faqat Tahrirlash ichida, eng pastda va tasdiq bilan:
          parol esdan chiqsa qayta kirish qiyin, shuning uchun tasodifan bosilmasin. */}
      {tahrirlash && (
        <div className="mt-6 rounded-xl2 border border-gray-200 bg-white p-5">
          <button
            type="button"
            onClick={() => setChiqishTasdiq(true)}
            className="rounded-xl2 border border-red-300 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
          >
            Akkountdan chiqish
          </button>
        </div>
      )}

      {chiqishTasdiq && (
        <Modal title="Ishonchingiz komilmi?" onClose={() => setChiqishTasdiq(false)}>
          <p className="mb-4 text-sm text-gray-600">
            Akkountdan chiqsangiz, qayta kirish uchun login va parol kerak bo&apos;ladi.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setChiqishTasdiq(false)}
              className="flex-1 rounded-xl2 border border-gray-300 px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Qolish
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex-1 rounded-xl2 bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600"
            >
              Ha, chiqish
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
