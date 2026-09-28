"use client";

// app/login/page.js
// Login + parol bilan Firebase Auth orqali kirish (0-QISM, 4-band):
// login "login@platforma.uz" soxta email formatiga o'giriladi, taqqoslash
// lowercase'da bo'ladi. Kirgandan so'ng users hujjatidagi `role`ga qarab
// /teacher yoki /student sahifasiga yo'naltiriladi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { loginToAuthEmail } from "@/lib/accountHelpers";

export default function LoginPage() {
  const router = useRouter();

  const [login, setLogin] = useState("");
  const [parol, setParol] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Hashteg orqali sinfga qo'shilgan o'quvchi uchun: parolni tiklash so'rovi
  // ustozning Xabarlariga tushadi (login + maxfiy so'z bilan).
  const [showReset, setShowReset] = useState(false);
  const [resetLogin, setResetLogin] = useState("");
  const [resetSoz, setResetSoz] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetError, setResetError] = useState("");

  async function handleResetRequest(e) {
    e.preventDefault();
    setResetMsg("");
    setResetError("");
    if (!resetLogin.trim() || !resetSoz.trim()) {
      setResetError("Login va maxfiy so'zni kiriting");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/parol-sorovi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: resetLogin, maxfiySoz: resetSoz }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResetError(data.error || "Xatolik yuz berdi");
        return;
      }
      setResetMsg(
        "Agar ma'lumotlar to'g'ri bo'lsa, so'rov ustozingizga yuborildi. Ustoz yangi parolni sizga yetkazadi."
      );
      setResetSoz("");
    } catch {
      setResetError("Server bilan bog'lanishda xatolik");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const loginTrimmed = login.trim();
    if (!loginTrimmed || !parol) {
      setError("Login va parolni kiriting");
      return;
    }

    setLoading(true);
    try {
      const email = loginToAuthEmail(loginTrimmed);
      const cred = await signInWithEmailAndPassword(auth, email, parol);

      const userSnap = await getDoc(doc(db, "users", cred.user.uid));
      if (!userSnap.exists()) {
        setError("Foydalanuvchi ma'lumotlari topilmadi. Admin bilan bog'laning.");
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      router.push(userData.role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError("Login yoki parol noto'g'ri");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Kirish</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="rounded-xl2 border border-gray-300 px-4 py-3"
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Parol"
          value={parol}
          onChange={(e) => setParol(e.target.value)}
          className="rounded-xl2 border border-gray-300 px-4 py-3"
          autoComplete="current-password"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? "Kirilmoqda..." : "Kirish"}
        </button>
      </form>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="text-secondary underline"
        >
          Parolni unutdingizmi?
        </button>
        {showHelp && (
          <div className="mt-2 flex flex-col gap-2 text-gray-500">
            <p>Ustoz yoki admin bilan bog&apos;laning.</p>
            <button
              type="button"
              onClick={() => setShowReset((v) => !v)}
              className="text-secondary underline"
            >
              Hashteg orqali sinfga qo&apos;shilganmisiz? Ustozga so&apos;rov yuborish
            </button>
          </div>
        )}

        {showHelp && showReset && (
          <form onSubmit={handleResetRequest} className="mt-3 flex flex-col gap-2 text-left">
            <input
              type="text"
              placeholder="Login"
              value={resetLogin}
              onChange={(e) => setResetLogin(e.target.value)}
              className="rounded-xl2 border border-gray-300 px-4 py-3"
            />
            <input
              type="text"
              placeholder="Maxfiy so'z"
              value={resetSoz}
              onChange={(e) => setResetSoz(e.target.value)}
              className="rounded-xl2 border border-gray-300 px-4 py-3"
            />
            {resetError && <p className="text-sm text-red-500">{resetError}</p>}
            {resetMsg && <p className="text-sm text-green-700">{resetMsg}</p>}
            <button
              type="submit"
              disabled={resetLoading}
              className="rounded-xl2 border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {resetLoading ? "Yuborilmoqda..." : "So'rov yuborish"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
