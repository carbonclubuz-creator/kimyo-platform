// components/BackLink.js
// Barcha panellarda (o'quvchi, ustoz, admin) bir xil ko'rinishdagi "Orqaga"
// tugmasi. Tarixga (history) emas, aniq sahifaga olib boradi — shunda
// foydalanuvchi qayerdan kelgan bo'lishidan qat'i nazar, kutilgan joyga qaytadi.

import Link from "next/link";

export default function BackLink({ href, children = "Orqaga", className = "" }) {
  return (
    <Link
      href={href}
      className={`mb-4 inline-flex items-center gap-1.5 rounded-xl2 border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 ${className}`}
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
