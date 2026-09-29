"use client";

// app/login/page.js
// Login + parol bilan Firebase Auth orqali kirish (0-QISM, 4-band):
// login "login@platforma.uz" soxta email formatiga o'giriladi, taqqoslash
// lowercase'da bo'ladi. Kirgandan so'ng users hujjatidagi `role`ga qarab
// /teacher yoki /student sahifasiga yo'naltiriladi.
//
// "Parolni unutdingizmi?": mustaqil o'quvchi (yoki ustoz) Ism, Familiya, Viloyatni
// yuboradi -> so'rov admin panelida paydo bo'ladi -> ekranda nusxa qilinadigan
// matn + adminning Telegram havolasi chiqadi (o'quvchi shu matnni maxfiy so'zi
// bilan birga adminga yuboradi). Hashteg orqali sinfga qo'shilgan o'quvchi uchun
// eski oqim (login + maxfiy so'z -> ustozga so'rov) ham saqlangan.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { loginToAuthEmail, validateIsmFamiliya } from "@/lib/accountHelpers";
import { VILOYATLAR } from "@/lib/viloyatlar";
import { ADMIN_TELEGRAM_HAVOLA } from "@/lib/sozlamalar";
import BackLink from "@/components/BackLink";

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

  // Mustaqil o'quvchi / ustoz: Ism + Familiya + Viloyat orqali adminga so'rov.
  const [sorovRol, setSorovRol] = useState("oquvchi"); // "oquvchi" | "ustoz"
  const [sIsm, setSIsm] = useState("");
  const [sFamiliya, setSFamiliya] = useState("");
  const [sViloyat, setSViloyat] = useState("");
  const [sXato, setSXato] = useState("");
  const [sYuborilmoqda, setSYuborilmoqda] = useState(false);
  const [sNatija, setSNatija] = useState(null); // { matn } — yuborilgach
  const [sNusxalandi, setSNusxalandi] = useState(false);

  async function handleAdminSorovi(e) {
    e.preventDefault();
    setSXato("");

    const ismCheck = validateIsmFamiliya(sIsm);
    if (!ismCheck.valid) {
      setSXato(`Ism: ${ismCheck.error}`);
      return;
    }
    const familiyaCheck = validateIsmFamiliya(sFamiliya);
    if (!familiyaCheck.valid) {
      setSXato(`Familiya: ${familiyaCheck.error}`);
      return;
    }
    if (!sViloyat) {
      setSXato("Viloyatni tanlang");
      return;
    }

    setSYuborilmoqda(true);
    try {
      const res = await fetch("/api/auth/mustaqil-parol-sorovi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ism: sIsm,
          familiya: sFamiliya,
          viloyat: sViloyat,
          rol: sorovRol,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSXato(data.error || "Xatolik yuz berdi");
        return;
      }
      // Nusxa qilinadigan matn: "Ali Valiyev, Toshkent shahri" (ustozda oxiriga "(ustoz)").
      const asos = `${ismCheck.value} ${familiyaCheck.value}, ${sViloyat}`;
      setSNatija({ matn: sorovRol === "ustoz" ? `${asos} (ustoz)` : asos });
    } catch {
      setSXato("Server bilan bog'lanishda xatolik");
    } finally {
      setSYuborilmoqda(false);
    }
  }

  async function sorovMatniniNusxalash() {
    if (!sNatija) return;
    try {
      await navigator.clipboard.writeText(sNatija.matn);
      setSNusxalandi(true);
      setTimeout(() => setSNusxalandi(false), 1500);
    } catch {
      // Clipboard mavjud bo'lmasa jim o'tamiz — matn ekranda ko'rinib turadi, qo'lda ko'chiriladi.
    }
  }

  function sorovniQaytaBoshlash() {
    setSNatija(null);
    setSNusxalandi(false);
    setSXato("");
  }

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
      <BackLink href="/" className="mb-0 self-start" />
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
          <div className="mt-3 flex flex-col gap-3 text-left">
            {!sNatija && (
              <form onSubmit={handleAdminSorovi} className="flex flex-col gap-2">
                <p className="text-center text-gray-500">
                  Ism, familiya va viloyatingizni kiriting. Shaxsingizni admin tasdiqlab, yangi
                  parolni yuboradi.
                </p>

                <div className="grid grid-cols-2 gap-1" role="tablist" aria-label="Kim sifatida">
                  {[
                    { key: "oquvchi", label: "O'quvchi" },
                    { key: "ustoz", label: "Ustoz" },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      role="tab"
                      aria-selected={sorovRol === r.key}
                      onClick={() => setSorovRol(r.key)}
                      className={`rounded-xl2 px-3 py-2 text-sm font-semibold transition ${
                        sorovRol === r.key
                          ? "bg-secondary text-white"
                          : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Ism"
                  value={sIsm}
                  onChange={(e) => setSIsm(e.target.value)}
                  className="rounded-xl2 border border-gray-300 px-4 py-3"
                />
                <input
                  type="text"
                  placeholder="Familiya"
                  value={sFamiliya}
                  onChange={(e) => setSFamiliya(e.target.value)}
                  className="rounded-xl2 border border-gray-300 px-4 py-3"
                />
                <select
                  value={sViloyat}
                  onChange={(e) => setSViloyat(e.target.value)}
                  className="rounded-xl2 border border-gray-300 px-4 py-3 text-gray-700"
                >
                  <option value="">Viloyatni tanlang</option>
                  {VILOYATLAR.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>

                {sXato && <p className="text-sm text-red-500">{sXato}</p>}

                <button
                  type="submit"
                  disabled={sYuborilmoqda}
                  className="rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                >
                  {sYuborilmoqda ? "Yuborilmoqda..." : "Jo'natish"}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Sinfdagi o&apos;quvchi bo&apos;lsangiz, parolni tiklash uchun ustozingizga
                  murojaat qiling.
                </p>
              </form>
            )}

            {sNatija && (
              <div className="flex flex-col gap-3">
                <p className="text-center font-semibold text-green-700">So&apos;rovingiz yuborildi.</p>

                <div className="flex items-center justify-between gap-3 rounded-xl2 border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="min-w-0 break-words font-semibold text-gray-900">{sNatija.matn}</p>
                  <button
                    type="button"
                    onClick={sorovMatniniNusxalash}
                    className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                  >
                    {sNusxalandi ? "Nusxalandi!" : "Nusxa olish"}
                  </button>
                </div>

                {ADMIN_TELEGRAM_HAVOLA ? (
                  <a
                    href={ADMIN_TELEGRAM_HAVOLA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl2 bg-secondary px-4 py-3 text-center font-semibold text-white hover:opacity-90"
                  >
                    Adminga Telegramda yozish
                  </a>
                ) : (
                  <p className="text-center text-xs text-gray-400">
                    Adminning Telegram manzili hali sozlanmagan.
                  </p>
                )}

                <p className="text-center text-gray-500">
                  Shu matnni nusxa qilib, maxfiy so&apos;zingiz bilan birga adminga yuboring.
                </p>

                <button
                  type="button"
                  onClick={sorovniQaytaBoshlash}
                  className="self-center text-xs text-gray-400 underline"
                >
                  Boshqa ma&apos;lumot bilan yuborish
                </button>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 text-center">
              <button
                type="button"
                onClick={() => setShowReset((v) => !v)}
                className="text-secondary underline"
              >
                Hashteg orqali sinfga qo&apos;shilganmisiz? Ustozga so&apos;rov yuborish
              </button>
            </div>
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
