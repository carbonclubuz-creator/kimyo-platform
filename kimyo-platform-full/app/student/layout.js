// app/student/layout.js
// O'quvchi paneli uchun umumiy qobiq: auth guard (StudentAuthProvider — faqat
// role === "student" bo'lganlar kira oladi) + yuqori panel (jonlar ko'rsatkichi
// shu yerda, StudentHeader ichida).

import StudentAuthProvider from "./AuthProvider";
import StudentHeader from "./StudentHeader";

export default function StudentLayout({ children }) {
  return (
    <StudentAuthProvider>
      <div className="min-h-screen bg-gray-50">
        <StudentHeader />
        {children}
      </div>
    </StudentAuthProvider>
  );
}
