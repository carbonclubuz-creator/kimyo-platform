"use client";

// app/register/teacher/page.js
// Ustoz ro'yxatdan o'tishi (0-QISM, 1-4-band): o'quvchinikiga o'xshash, faqat
// login "Ustoz" prefiksi bilan yaratiladi va qo'shimcha maktabMarkaz +
// maxfiySoz (parolni admin orqali tiklash uchun) maydonlari so'raladi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  createAccountWithUniqueLogin,
  generatePassword,
  validateIsmFamiliya,
} from "@/lib/accountHelpers";
import { VILOYATLAR } from "@/lib/viloyatlar";
import CredentialsCard from "@/components/CredentialsCard";

export default function TeacherRegisterPage() {
  const router = useRouter();

  const [ism, setIsm] = useState("");
  const [familiya, setFamiliya] = useState("");
  const [viloyat, setViloyat] = useState("");
  const [tuman, setTuman] = useState("");
  const [maktabMarkaz, setMaktabMarkaz] = useState("");
  const [maxfiySoz, setMaxfiySoz] = useState("");

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { login, password }

  function validate() {
    const nextErrors = {};

    const ismCheck = validateIsmFamiliya(ism);
    if (!ismCheck.valid) nextErrors.ism = ismCheck.error;

    const familiyaCheck = validateIsmFamiliya(familiya);
    if (!familiyaCheck.valid) nextErrors.familiya = familiyaCheck.error;

    if (!viloyat) nextErrors.viloyat = "Viloyatni tanlang";
    if (!tuman.trim()) nextErrors.tuman = "Tumanni kiriting";
    if (!maktabMarkaz.trim()) nextErrors.maktabMarkaz = "Maktab yoki markaz nomini kiriting";

    if (!maxfiySoz.trim()) {
      nextErrors.maxfiySoz = "Maxfiy so'zni kiriting";
    } else if (maxfiySoz.trim().length < 4) {
      nextErrors.maxfiySoz = "Kamida 4 ta belgidan iborat bo'lsin";
    }

    setErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, ismCheck, familiyaCheck };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    const { valid, ismCheck, familiyaCheck } = validate();
    if (!valid) return;

    setLoading(true);
    try {
      const ismCap = ismCheck.value;
      const familiyaCap = familiyaCheck.value;
      const password = generatePassword();

      const { login, cred } = await createAccountWithUniqueLogin({
        ismCap,
        familiyaCap,
        prefix: "Ustoz",
        password,
      });

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        role: "teacher",
        ism: ismCap,
        familiya: familiyaCap,
        login,
        loginLower: login.toLowerCase(),
        viloyat,
        tuman: tuman.trim(),
        maktabMarkaz: maktabMarkaz.trim(),
        maxfiySoz: maxfiySoz.trim(),
        umumiyBali: 0,
        createdAt: serverTimestamp(),
      });

      setResult({ login, password });
    } catch (err) {
      setFormError("Ro'yxatdan o'tishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Tabriklaymiz! 🎉</h1>
        <p className="text-gray-600">
          Akkountingiz yaratildi. Login va parolingizni saqlab qo&apos;ying — keyingi
          safar kirish uchun kerak bo&apos;ladi.
        </p>
        <CredentialsCard login={result.login} password={result.password} />
        <button
          type="button"
          onClick={() => router.push("/teacher")}
          className="rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark"
        >
          Davom etish
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Ustoz ro&apos;yxatdan o&apos;tishi</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <input
            type="text"
            placeholder="Ism"
            value={ism}
            onChange={(e) => setIsm(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-4 py-3"
          />
          {errors.ism && <p className="mt-1 text-sm text-red-500">{errors.ism}</p>}
        </div>

        <div>
          <input
            type="text"
            placeholder="Familiya"
            value={familiya}
            onChange={(e) => setFamiliya(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-4 py-3"
          />
          {errors.familiya && <p className="mt-1 text-sm text-red-500">{errors.familiya}</p>}
        </div>

        <div>
          <select
            value={viloyat}
            onChange={(e) => setViloyat(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-4 py-3 text-gray-700"
          >
            <option value="">Viloyatni tanlang</option>
            {VILOYATLAR.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          {errors.viloyat && <p className="mt-1 text-sm text-red-500">{errors.viloyat}</p>}
        </div>

        <div>
          <input
            type="text"
            placeholder="Tuman"
            value={tuman}
            onChange={(e) => setTuman(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-4 py-3"
          />
          {errors.tuman && <p className="mt-1 text-sm text-red-500">{errors.tuman}</p>}
        </div>

        <div>
          <input
            type="text"
            placeholder="Maktab / o'quv markaz"
            value={maktabMarkaz}
            onChange={(e) => setMaktabMarkaz(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-4 py-3"
          />
          {errors.maktabMarkaz && (
            <p className="mt-1 text-sm text-red-500">{errors.maktabMarkaz}</p>
          )}
        </div>

        <div>
          <input
            type="text"
            placeholder="Maxfiy so'z (parolni tiklash uchun)"
            value={maxfiySoz}
            onChange={(e) => setMaxfiySoz(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-4 py-3"
          />
          {errors.maxfiySoz && <p className="mt-1 text-sm text-red-500">{errors.maxfiySoz}</p>}
        </div>

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish"}
        </button>
      </form>
    </main>
  );
}
