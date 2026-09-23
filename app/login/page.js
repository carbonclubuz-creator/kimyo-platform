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
          <p className="mt-2 text-gray-500">Ustoz yoki admin bilan bog&apos;laning.</p>
        )}
      </div>
    </main>
  );
}
