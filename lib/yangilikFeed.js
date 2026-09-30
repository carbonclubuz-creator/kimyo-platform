// lib/yangilikFeed.js
// O'quvchi yangiliklar lentasi uchun SOF (Firestore'ga bog'liq bo'lmagan) mantiq:
// ikki manbani (a — ustozning sinfga yo'naltirilgan o'z postlari, b — ustoz yuborgan
// admin postlari) BITTA tartibga keltirish va to'g'ri sahifalash.
//
// Yagona tartib (barcha manba uchun): vaqt KAMAYISH bo'yicha; vaqt teng bo'lsa —
// avval "b", keyin "a"; keyin hujjat ID'si kamayish bo'yicha. Har yozuv shu tartibda
// noyob o'rin egallaydi, shuning uchun kursor ("oxirgi ko'rsatilgan yozuv") sahifalar
// orasida hech narsani takrorlamaydi va tushirib qoldirmaydi — vaqtlari bir xil
// bo'lsa ham.
//
// Yozuv: { s, n, tur: "a" | "b", id }  (s, n — Timestamp sekund va nanosekund).

export const DARAJA = { a: 1, b: 2 };

/** Lentadagi tartib: manfiy = x y dan oldin turadi. */
export function yozuvSolishtir(x, y) {
  if (x.s !== y.s) return y.s - x.s;
  if (x.n !== y.n) return y.n - x.n;
  if (x.tur !== y.tur) return DARAJA[y.tur] - DARAJA[x.tur];
  if (x.id !== y.id) return x.id > y.id ? -1 : 1;
  return 0;
}

// ---- Kursor: "sekund:nanosekund:tur:id" ----

export function kursorYasash(y) {
  return `${y.s}:${y.n}:${y.tur}:${y.id}`;
}

/** Noto'g'ri kursor uchun null. */
export function kursorOqish(qiymat) {
  if (typeof qiymat !== "string") return null;
  const m = /^(\d{1,12}):(\d{1,9}):([ab]):([A-Za-z0-9_-]{1,200})$/.exec(qiymat);
  if (!m) return null;
  return { s: Number(m[1]), n: Number(m[2]), tur: m[3], id: m[4] };
}

/**
 * Bitta manbaning so'rovi kursordan qayerdan boshlanishi kerakligini aytadi
 * (manba tartibi: vaqt kamayish, hujjat ID'si kamayish):
 *   { rejim: "keyin", id }   — startAfter(vaqt, id): shu yozuvdan keyingilar (bir xil manba);
 *   { rejim: "keyin", id: null } — startAfter(vaqt): shu vaqtdagilarning HAMMASI o'tib ketgan
 *                              (bu manbaning teng vaqtli yozuvlari kursordan OLDIN turadi);
 *   { rejim: "dan" }         — startAt(vaqt): teng vaqtli yozuvlar kursordan KEYIN turadi.
 */
export function manbaKursori(manbaTuri, kursor) {
  if (!kursor) return null;
  const d = DARAJA[manbaTuri];
  const k = DARAJA[kursor.tur];
  if (d === k) return { rejim: "keyin", s: kursor.s, n: kursor.n, id: kursor.id };
  if (d < k) return { rejim: "dan", s: kursor.s, n: kursor.n, id: null };
  return { rejim: "keyin", s: kursor.s, n: kursor.n, id: null };
}

/**
 * Har manbadan (limit + 1 tadan) olingan yozuvlarni birlashtiradi.
 * @returns {{ sahifa: object[], yana: boolean }}  sahifa — birinchi `limit` ta yozuv.
 */
export function birlashtirSahifa(manbalar, limit) {
  const hammasi = manbalar.flat().sort(yozuvSolishtir);
  return { sahifa: hammasi.slice(0, limit), yana: hammasi.length > limit };
}

/** Timestamp (s, n) ni millisekundga aylantiradi. */
export function yozuvMillis(y) {
  return y.s * 1000 + Math.floor(y.n / 1e6);
}
