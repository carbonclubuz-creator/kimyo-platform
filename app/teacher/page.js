"use client";

// app/teacher/page.js
// Ustoz asosiy sahifasi: kirgan ustozga tegishli sinflar ro'yxati (classes
// kolleksiyasidan teacherId bo'yicha filtrlangan). Hech qanday sinf bo'lmasa
// — "Sinf yaratish" taklifi ko'rsatiladi. "Sinf yaratish" tugmasi har doim
// ko'rinadi.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import Modal from "@/components/Modal";

export default function TeacherDashboardPage() {
  const { user } = useTeacherAuth();
  const [classes, setClasses] = useState(null); // null = yuklanmoqda
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.nomi || "").localeCompare(b.nomi || "", "uz"));
      setClasses(list);
    });
    return unsubscribe;
  }, [user.uid]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mening sinflarim</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark"
        >
          + Sinf yaratish
        </button>
      </div>

      {classes === null && <p className="text-gray-400">Yuklanmoqda...</p>}

      {classes !== null && classes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500">Hali sinflaringiz yo&apos;q.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark"
          >
            Birinchi sinfni yarating
          </button>
        </div>
      )}

      {classes !== null && classes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/teacher/class/${c.id}`}
                className="flex items-center justify-between rounded-xl2 border border-gray-200 bg-white px-5 py-4 transition hover:border-primary"
              >
                <span className="font-semibold">{c.nomi}</span>
                <span className="text-gray-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateClassModal teacherUid={user.uid} onClose={() => setShowCreate(false)} />
      )}
    </main>
  );
}

function CreateClassModal({ teacherUid, onClose }) {
  const [nomi, setNomi] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    const trimmed = nomi.trim();
    if (!trimmed) {
      setError("Sinf nomini kiriting");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "classes"), {
        nomi: trimmed,
        teacherId: teacherUid,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch {
      setError("Sinf yaratishda xatolik yuz berdi");
      setSaving(false);
    }
  }

  return (
    <Modal title="Yangi sinf" onClose={onClose}>
      <form onSubmit={handleCreate} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder='Sinf nomi (masalan "10-A")'
          value={nomi}
          onChange={(e) => setNomi(e.target.value)}
          className="rounded-xl2 border border-gray-300 px-4 py-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? "Yaratilmoqda..." : "Yaratish"}
        </button>
      </form>
    </Modal>
  );
}
