"use client";

// components/CredentialsCard.js
// Ro'yxatdan o'tishdan so'ng generatsiya qilingan login/parolni ko'rsatish uchun
// (nusxalash tugmasi bilan). Student va teacher ro'yxatdan o'tish sahifalarida
// ishlatiladi.

import { useState } from "react";

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard mavjud bo'lmasa (masalan http muhitida) jim o'tkazamiz —
      // foydalanuvchi qiymatni qo'lda ko'chirib olishi mumkin.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl2 border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="truncate font-mono text-lg font-semibold text-gray-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
      >
        {copied ? "Nusxalandi!" : "Nusxalash"}
      </button>
    </div>
  );
}

export default function CredentialsCard({ login, password }) {
  return (
    <div className="flex flex-col gap-3">
      <CopyField label="Login" value={login} />
      <CopyField label="Parol" value={password} />
    </div>
  );
}
