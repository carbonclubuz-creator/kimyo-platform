// lib/testToast.js
// Test ichidagi motivatsion toast'lar (5B) uchun toza mantiq. Next.js sahifa
// fayllari faqat maxsus nomlarni eksport qila oladi — shu sabab bu yerda.

/**
 * Javob berilgan savollar soni shu qiymatga yetganda "yarmi" toasti chiqadi
 * = ceil(jami/2). Juda kichik testlarda (jami < 2) yarim-toast yo'q -> null.
 */
export function yarmiChegarasi(jami) {
  return jami >= 2 ? Math.ceil(jami / 2) : null;
}
