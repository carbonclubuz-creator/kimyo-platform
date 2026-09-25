"use client";

import { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [showRoleChoice, setShowRoleChoice] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold text-primary">Kimyo Platformasi</h1>
      <p className="max-w-md text-gray-600">
        Duolingo uslubidagi kimyo ta&apos;lim platformasi — MVP.
      </p>

      {!showRoleChoice ? (
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-xl2 bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-dark"
          >
            Kirish
          </Link>
          <button
            type="button"
            onClick={() => setShowRoleChoice(true)}
            className="rounded-xl2 border border-primary px-6 py-3 font-semibold text-primary"
          >
            Ro&apos;yxatdan o&apos;tish
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500">Kim sifatida ro&apos;yxatdan o&apos;tmoqchisiz?</p>
          <div className="flex gap-4">
            <Link
              href="/register/student"
              className="rounded-xl2 bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-dark"
            >
              O&apos;quvchi
            </Link>
            <Link
              href="/register/teacher"
              className="rounded-xl2 border border-primary px-6 py-3 font-semibold text-primary"
            >
              Ustoz
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowRoleChoice(false)}
            className="text-xs text-gray-400 underline"
          >
            Orqaga
          </button>
        </div>
      )}
    </main>
  );
}
