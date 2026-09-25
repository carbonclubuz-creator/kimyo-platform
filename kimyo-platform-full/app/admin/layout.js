// app/admin/layout.js
// /admin ostidagi barcha sahifalar (foydalanuvchilar, savollar) uchun
// umumiy qobiq: parol darvozasi (AdminAuthProvider) + yuqori navigatsiya
// (AdminHeader).

import AdminAuthProvider from "./AdminAuthProvider";
import AdminHeader from "./AdminHeader";

export default function AdminLayout({ children }) {
  return (
    <AdminAuthProvider>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        {children}
      </div>
    </AdminAuthProvider>
  );
}
