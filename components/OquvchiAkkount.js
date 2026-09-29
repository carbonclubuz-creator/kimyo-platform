"use client";

// components/OquvchiAkkount.js
// Ustoz o'quvchining login/parolini ko'radigan va yangi parol yaratadigan
// joylar (sinf jadvali qatori va individual o'quvchi sahifasi) uchun UMUMIY
// mantiq va kichik ko'rinishlar. Avval bu kod `class/[id]/page.js`dagi
// StudentRow ichida edi — endi ikkala joy bir xil manbadan foydalanadi
// (nusxa ko'chirilmagan).
//
// Foydalanish: `const h = useOquvchiAkkount(student, user)` so'ng
// <LoginQiymati/>, <ParolQiymati/>, <ParolYangilashTugmasi/> ni istalgan
// maketda (jadval katagi yoki kartochka) joylashtirish mumkin.

import { useState } from "react";
import { CopyIcon, EyeIcon, EyeOffIcon } from "@/components/icons";

/** Nusxalash, parolni ko'rsatish/yashirish va "Yangi parol yarat" holati. */
export function useOquvchiAkkount(student, user) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  async function copy(value, field) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1200);
    } catch {
      // Clipboard mavjud bo'lmasa (masalan http muhitida) jim o'tkazamiz.
    }
  }

  async function handleResetPassword() {
    setResetError("");
    setResetting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/teacher/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ studentUid: student.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      // Firestore onSnapshot yangi parolni o'zi yetkazadi — foydalanuvchi
      // buni darhol ko'rishi uchun ochiq holatga o'tkazamiz.
      setShowPassword(true);
    } catch {
      setResetError("Parolni yangilab bo'lmadi");
    } finally {
      setResetting(false);
    }
  }

  return {
    showPassword,
    setShowPassword,
    copiedField,
    copy,
    resetting,
    resetError,
    handleResetPassword,
  };
}

/** Login + nusxalash tugmasi. */
export function LoginQiymati({ student, h }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono">{student.login}</span>
      <button
        type="button"
        onClick={() => h.copy(student.login, "login")}
        className="text-gray-400 hover:text-gray-600"
        aria-label="Loginni nusxalash"
      >
        <CopyIcon />
      </button>
      {h.copiedField === "login" && <span className="text-xs text-primary">Nusxalandi!</span>}
    </div>
  );
}

/** Parol (ko'z bilan yashirin/ko'rsatilgan) + nusxalash; parol bo'lmasa "—". */
export function ParolQiymati({ student, h }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono">
        {student.currentPassword ? (h.showPassword ? student.currentPassword : "••••••••") : "—"}
      </span>
      {student.currentPassword && (
        <>
          <button
            type="button"
            onClick={() => h.setShowPassword((v) => !v)}
            className="text-gray-400 hover:text-gray-600"
            aria-label={h.showPassword ? "Yashirish" : "Ko'rsatish"}
          >
            {h.showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button
            type="button"
            onClick={() => h.copy(student.currentPassword, "password")}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Parolni nusxalash"
          >
            <CopyIcon />
          </button>
          {h.copiedField === "password" && <span className="text-xs text-primary">Nusxalandi!</span>}
        </>
      )}
    </div>
  );
}

/**
 * "Yangi parol yarat" tugmasi — FAQAT `qoshilishUsuli !== "hashteg"` bo'lsa;
 * hashteg orqali qo'shilganlar uchun izoh matni chiqadi (parolini ustoz faqat
 * o'quvchi so'rov yuborganda yangilaydi).
 */
export function ParolYangilashTugmasi({ student, h }) {
  if (student.qoshilishUsuli === "hashteg") {
    return (
      <span
        className="text-xs text-gray-400"
        title="Parolni faqat o'quvchi so'rov yuborganda (Xabarlar orqali) yangilash mumkin"
      >
        Hashteg orqali
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={h.handleResetPassword}
      disabled={h.resetting}
      className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
    >
      {h.resetting ? "..." : "Yangi parol yarat"}
    </button>
  );
}
