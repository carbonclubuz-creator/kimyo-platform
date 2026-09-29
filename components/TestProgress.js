"use client";

// components/TestProgress.js
// Test tepasidagi to'lib boruvchi progress bar: kengligi = javob berilgan
// savollar / jami. Chiziq uchida kichik 🧪 ikonka chiziq bilan birga suriladi.
// Silliq animatsiya; `prefers-reduced-motion` bo'lsa o'chiriladi
// (Tailwind `motion-reduce:`). Kirish uchun role="progressbar".

export default function TestProgress({ javobBerilgan, jami }) {
  const foiz = jami > 0 ? Math.min(100, Math.max(0, (javobBerilgan / jami) * 100)) : 0;

  return (
    <div className="mx-3 mb-3">
      <div
        className="relative h-3 rounded-full bg-gray-200"
        role="progressbar"
        aria-label="Test jarayoni"
        aria-valuemin={0}
        aria-valuemax={jami}
        aria-valuenow={javobBerilgan}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${foiz}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-base leading-none transition-[left] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: `${foiz}%` }}
        >
          🧪
        </span>
      </div>
    </div>
  );
}
