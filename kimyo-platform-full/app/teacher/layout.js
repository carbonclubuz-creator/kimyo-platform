// app/teacher/layout.js
// Ustoz paneli uchun umumiy qobiq: auth guard (TeacherAuthProvider — faqat
// role === "teacher" bo'lganlar kira oladi) + yuqori panel.
// To'liq navigatsiya (Sinflar / Akkount va h.k.) keyingi promtda qo'shiladi.

import TeacherAuthProvider from "./AuthProvider";
import TeacherHeader from "./TeacherHeader";

export default function TeacherLayout({ children }) {
  return (
    <TeacherAuthProvider>
      <div className="min-h-screen bg-gray-50">
        <TeacherHeader />
        {children}
      </div>
    </TeacherAuthProvider>
  );
}
