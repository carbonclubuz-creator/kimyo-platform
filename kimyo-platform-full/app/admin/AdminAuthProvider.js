"use client";

// app/admin/AdminAuthProvider.js
// Admin bo'limi uchun umumiy "parol darvozasi" (0-QISM 6-PROMPT: Firebase
// Auth emas, oddiy umumiy parol). Parol faqat shu brauzer sessiyasida
// (sessionStorage) saqlanadi. `fetchAdmin` orqali har bir /api/admin/**
// so'roviga "x-admin-password" header'i avtomatik qo'shiladi; 401 kelsa
// (parol noto'g'ri/eskirgan) sessiya tozalanib, qayta parol so'raladi —
// shu sabab /admin ostidagi barcha sahifalar (foydalanuvchilar, savollar)
// bir xil xatti-harakatga ega bo'ladi.

import { createContext, useContext, useEffect, useState } from "react";

const SESSION_KEY = "kimyo_admin_parol";
const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth faqat AdminAuthProvider ichida ishlatilishi kerak");
  }
  return ctx;
}

export default function AdminAuthProvider({ children }) {
  const [parol, setParol] = useState(null); // null = hali sessionStorage tekshirilmadi
  const [kiritilgan, setKiritilgan] = useState("");
  const [xato, setXato] = useState("");

  useEffect(() => {
    const saqlangan = typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null;
    setParol(saqlangan || "");
  }, []);

  function kirish(e) {
    e.preventDefault();
    if (!kiritilgan.trim()) return;
    setXato("");
    sessionStorage.setItem(SESSION_KEY, kiritilgan);
    setParol(kiritilgan);
  }

  function chiqish() {
    sessionStorage.removeItem(SESSION_KEY);
    setParol("");
    setKiritilgan("");
  }

  async function fetchAdmin(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), "x-admin-password": parol },
    });
    if (res.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      setParol("");
      setXato("Parol noto'g'ri yoki sessiya eskirgan, qayta kiriting");
    }
    return res;
  }

  if (parol === null) {
    return null; // sessionStorage tekshirilayotgan qisqa lahza
  }

  if (!parol) {
    return (
      <main className="mx-auto max-w-sm p-6">
        <h1 className="mb-6 text-2xl font-bold">Admin</h1>
        <form onSubmit={kirish} className="flex flex-col gap-3">
          <input
            type="password"
            value={kiritilgan}
            onChange={(e) => setKiritilgan(e.target.value)}
            placeholder="Admin paroli"
            className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
            autoFocus
          />
          {xato && <p className="text-sm text-red-500">{xato}</p>}
          <button
            type="submit"
            className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark"
          >
            Kirish
          </button>
        </form>
      </main>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ fetchAdmin, chiqish }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
