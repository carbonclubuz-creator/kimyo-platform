// TODO (keyingi promt): auth guard — faqat role === "student" bo'lganlar kira oladi,
// jonlar (hearts) ko'rsatkichi shu yerga qo'shiladi.

export default function StudentLayout({ children }) {
  return <div className="min-h-screen">{children}</div>;
}
