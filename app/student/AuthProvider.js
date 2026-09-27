"use client";

// app/student/AuthProvider.js
// O'quvchi paneli uchun auth guard: faqat kirgan va role === "student"
// bo'lgan foydalanuvchilar app/student/** ichidagi sahifalarni ko'ra oladi.
// Joriy foydalanuvchi (Firebase Auth user) va uning Firestore hujjati
// (userData, realtime) Context orqali pastki sahifalarga uzatiladi.
//
// Qolgan jonlar soni endi /api/student/hearts orqali (server, Admin SDK)
// olinadi — jonlar kolleksiyasi client'dan endi umuman o'qilmaydi/
// yozilmaydi (0-QISM xavfsizlik yaxshilanishi: savollar/urinishlar/jonlar
// faqat serverda ishlaydi). Shuning uchun bu yerda realtime emas, "mount"da
// va refreshHearts() chaqirilganda yangilanadi (masalan test boshlangач).

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { KUNLIK_JON_SONI } from "@/lib/heartsHelpers";

const StudentAuthContext = createContext(null);

export function useStudentAuth() {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) {
    throw new Error("useStudentAuth faqat StudentAuthProvider ichida ishlatilishi kerak");
  }
  return ctx;
}

export default function StudentAuthProvider({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // "loading" | "ready"
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [qolganJon, setQolganJon] = useState(KUNLIK_JON_SONI);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }
      setUser(firebaseUser);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!user) return undefined;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists() || snap.data().role !== "student") {
        router.replace("/login");
        return;
      }
      setUserData(snap.data());
      setStatus("ready");
    });
    return unsubscribe;
  }, [user, router]);

  async function refreshHearts() {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/student/hearts", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setQolganJon(data.qolganJon);
    } catch {
      // jim — header shunchaki eski qiymatni ko'rsatib turadi
    }
  }

  useEffect(() => {
    if (user) refreshHearts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // userData endi realtime (onSnapshot) kuzatilgani uchun qo'lda qayta
  // o'qishga ehtiyoj yo'q — funksiya faqat eski chaqiruvlar bilan moslik
  // uchun (hech narsa qilmaydi, xato bermaydi) saqlab qolindi.
  async function refreshUserData() {}

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
    <StudentAuthContext.Provider
      value={{ user, userData, qolganJon, refreshHearts, refreshUserData, logout }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
}
