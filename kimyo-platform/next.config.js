/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Netlify'ning rasmiy Next.js runtime plagini (Server Components, SSR va h.k.)
  // to'liq qo'llab-quvvatlanadi. Agar to'liq static export kerak bo'lsa,
  // pastdagi qatorni oching (bu holda server-side funksiyalardan voz kechish kerak bo'ladi):
  // output: 'export',
};

module.exports = nextConfig;
