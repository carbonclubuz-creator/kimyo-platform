import "./globals.css";

export const metadata = {
  title: "Kimyo Platformasi",
  description: "Duolingo uslubidagi kimyo ta'lim platformasi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  );
}
