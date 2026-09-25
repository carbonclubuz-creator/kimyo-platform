"use client";

// app/teacher/AuthProvider.js
// Ustoz paneli uchun auth guard: faqat kirgan va role === "teacher" bo'lgan
// foydalanuvchilar app/teacher/** ichidagi sahifalarni ko'ra oladi.
// Joriy foydalanuvchi (Firebase Auth user + Firestore users hujjati)
// Context orqali pastki sahifalarga uzatiladi — har bir sahifa auth
// tekshiruvini qaytadan yozmasligi uchun.

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const TeacherAuthContext = createContext(null);

export function useTeacherAuth() {
  const ctx = useContext(TeacherAuthContext);
  if (!ctx) {
    throw new Error("useTeacherAuth faqat TeacherAuthProvider ichida ishlatilishi kerak");
  }
  return ctx;
}

export default function TeacherAuthProvider({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // "loading" | "ready"
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!snap.exists() || snap.data().role !== "teacher") {
        router.replace("/login");
        return;
      }

      setUser(firebaseUser);
      setUserData(snap.data());
      setStatus("ready");
    });

    return unsubscribe;
  }, [router]);

  async function refreshUserData() {
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) setUserData(snap.data());
  }

  async function logout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (status !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Yuklanmoqda...</p>
      </main>
    );
  }

  return (
    <TeacherAuthContext.Provider value={{ user, userData, refreshUserData, logout }}>
      {children}
    </TeacherAuthContext.Provider>
  );
}
