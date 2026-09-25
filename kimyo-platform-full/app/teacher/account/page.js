"use client";

// app/teacher/account/page.js
// Ustoz Akkount sahifasi (5-PROMPT): Ism, Familiya, Maktab/markaz, jami
// sinflar/o'quvchilar soni ko'rsatiladi. "Tahrirlash" (student'dagi kabi —
// Ism/Familiya/Viloyat, login o'zgarmaydi) va "Chiqish" tugmasi.

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import { validateIsmFamiliya } from "@/lib/accountHelpers";
import { VILOYATLAR } from "@/lib/viloyatlar";

export default function TeacherAccountPage() {
  const { user, userData, refreshUserData, logout } = useTeacherAuth();

  const [classIds, setClassIds] = useState(null); // null = yuklanmoqda
  const [oquvchilarSoni, setOquvchilarSoni] = useState(null);

  const [tahrirlash, setTahrirlash] = useState(false);
  const [ism, setIsm] = useState("");
  const [familiya, setFamiliya] = useState("");
  const [viloyat, setViloyat] = useState(VILOYATLAR[0]);
  const [xato, setXato] = useState("");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setClassIds(snap.docs.map((d) => d.id));
    });
    return unsubscribe;
  }, [user.uid]);

  useEffect(() => {
    if (classIds === null) return undefined;
    if (classIds.length === 0) {
      setOquvchilarSoni(0);
      return undefined;
    }
    // Firestore "in" operatori bir so'rovda ko'pi bilan 30 ta qiymatni qabul
    // qiladi — MVP darajasidagi ustoz (bitta necha sinfi bo'lgan) uchun yetarli.
    const q = query(collection(db, "users"), where("classId", "in", classIds.slice(0, 30)));
    const unsubscribe = onSnapshot(q, (snap) => setOquvchilarSoni(snap.size));
    return unsubscribe;
  }, [classIds]);

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

          <p className="text-sm text-gray-400">Maktab / o&apos;quv markaz</p>
          <p className="mb-4 text-lg font-semibold">{userData?.maktabMarkaz || "—"}</p>

          <p className="text-sm text-gray-400">Viloyat</p>
          <p className="mb-4 text-lg font-semibold">{userData?.viloyat}</p>

          <div className="mb-4 flex gap-6">
            <div>
              <p className="text-sm text-gray-400">Sinflar</p>
              <p className="text-lg font-semibold text-primary">{classIds?.length ?? "…"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">O&apos;quvchilar</p>
              <p className="text-lg font-semibold text-primary">{oquvchilarSoni ?? "…"}</p>
            </div>
          </div>

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
