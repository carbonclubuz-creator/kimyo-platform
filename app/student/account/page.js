"use client";

// app/student/account/page.js
// O'quvchi Akkount sahifasi (0-QISM 11-band, 5-PROMPT):
// Ism, Familiya, umumiy bali ko'rsatiladi. "Tahrirlash" — Ism/Familiya/Viloyat
// o'zgartirish formasi (login HECH QACHON o'zgarmaydi — 0-QISM 5-band).
// "Chiqish" tugmasi.

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStudentAuth } from "@/app/student/AuthProvider";
import { validateIsmFamiliya } from "@/lib/accountHelpers";
import { VILOYATLAR } from "@/lib/viloyatlar";

export default function StudentAccountPage() {
  const { user, userData, refreshUserData, logout } = useStudentAuth();

  const [tahrirlash, setTahrirlash] = useState(false);
  const [ism, setIsm] = useState("");
  const [familiya, setFamiliya] = useState("");
  const [viloyat, setViloyat] = useState(VILOYATLAR[0]);
  const [xato, setXato] = useState("");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  function tahrirlashniOchish() {
    setIsm(userData?.ism || "");
    setFamiliya(userData?.familiya || "");
    setViloyat(userData?.viloyat || VILOYATLAR[0]);
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
      <h1 className="mb-6 text-2xl font-bold">Akkount</h1>

      {!tahrirlash && (
        <div className="rounded-xl2 border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-400">Ism Familiya</p>
          <p className="mb-4 text-lg font-semibold">
            {userData?.ism} {userData?.familiya}
          </p>

          <p className="text-sm text-gray-400">Umumiy ball</p>
          <p className="mb-4 text-lg font-semibold text-primary">{userData?.umumiyBali ?? 0}</p>

          <p className="text-sm text-gray-400">Viloyat</p>
          <p className="mb-4 text-lg font-semibold">{userData?.viloyat}</p>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={tahrirlashniOchish}
              className="rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
            >
              Tahrirlash
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
            >
              Chiqish
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
    </main>
  );
}
