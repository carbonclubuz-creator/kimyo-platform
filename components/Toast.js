"use client";

// components/Toast.js
// Sodda, sarlavhasiz toast: ekran tepasida, savolni/tugmalarni TO'SMAYDI
// (pointer-events-none), 2.5 soniyadan keyin o'zi yo'qoladi va ekran o'qish
// vositalariga aria-live="polite" bilan e'lon qilinadi. Hozir faqat test
// sahifasida ishlatiladi (motivatsion matnlar).
//
// Foydalanish: `<Toast xabar={matn|null} onYoqol={() => setMatn(null)} />`.
// `xabar` o'zgarsa (yangi matn) taymer qaytadan boshlanadi.

import { useEffect } from "react";

export const TOAST_DAVOMIYLIGI_MS = 2500;

export default function Toast({ xabar, onYoqol }) {
  useEffect(() => {
    if (!xabar) return undefined;
    const t = setTimeout(onYoqol, TOAST_DAVOMIYLIGI_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xabar]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4"
    >
      {xabar && (
        <p className="rounded-xl2 bg-gray-900/90 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg">
          {xabar}
        </p>
      )}
    </div>
  );
}
