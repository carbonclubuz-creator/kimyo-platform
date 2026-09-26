"use client";

// app/student/AuthProvider.js
// O'quvchi paneli uchun auth guard: faqat kirgan va role === "student"
// bo'lgan foydalanuvchilar app/student/** ichidagi sahifalarni ko'ra oladi.
// Joriy foydalanuvchi (Firebase Auth user + Firestore users hujjati) va
// bugungi qolgan jonlar soni Context orqali pastki sahifalarga uzatiladi
// (jonlar hujjati realtime kuzatiladi — test sahifasida jon kamaytirilganda
// StudentHeader'dagi ko'rsatkich darhol yangilanishi uchun).

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { KUNLIK_JON_SONI, jonHujjatId, jonSanasi } from "@/lib/heartsHelpers";

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!snap.exists() || snap.data().role !== "student") {
        router.replace("/login");
        return;
      }

      setUser(firebaseUser);
      setUserData(snap.data());
      setStatus("ready");
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!user) return undefined;
    const sana = jonSanasi();
    const ref = doc(db, "jonlar", jonHujjatId(user.uid, sana));
    const unsubscribe = onSnapshot(ref, (snap) => {
      const ishlatilgan = snap.exists() ? snap.data().ishlatilgan || 0 : 0;
      setQolganJon(Math.max(0, KUNLIK_JON_SONI - ishlatilgan));
    });
    return unsubscribe;
  }, [user]);

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
    <StudentAuthContext.Provider value={{ user, userData, qolganJon, refreshUserData, logout }}>
      {children}
    </StudentAuthContext.Provider>
  );
}
