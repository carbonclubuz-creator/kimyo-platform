// lib/sozlamalar.js
// Client va serverda ishlatiladigan umumiy sozlamalar.
//
// NEXT_PUBLIC_ADMIN_TELEGRAM — adminning Telegram username'i (masalan
// "birkuch_admin", "@birkuch_admin" yoki to'liq "https://t.me/birkuch_admin"
// ham bo'ladi). Parolni tiklash oynasida t.me havolasi shundan yasaladi.
// Eslatma: NEXT_PUBLIC_ o'zgaruvchisi build vaqtida kodga joylanadi, shuning
// uchun o'zgartirgach saytni qayta build qilish (Netlify: redeploy) kerak.

function usernameniTozala(xom) {
  return String(xom || "")
    .trim()
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

export const ADMIN_TELEGRAM_USERNAME = usernameniTozala(process.env.NEXT_PUBLIC_ADMIN_TELEGRAM);

/** "https://t.me/username" yoki sozlanmagan bo'lsa null. */
export const ADMIN_TELEGRAM_HAVOLA = ADMIN_TELEGRAM_USERNAME
  ? `https://t.me/${ADMIN_TELEGRAM_USERNAME}`
  : null;
