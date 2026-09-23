"use client";

// app/teacher/class/[id]/page.js
// Sinf ichi sahifasi: shu sinfga tegishli o'quvchilar ro'yxati
// (Ism-Familiya, Login, Parol — ko'z ikonkasi bilan yashirin/ko'rsatilgan,
// nusxalash tugmasi), "O'quvchi qo'shish", har bir qator uchun
// "Yangi parol yarat" va sinfdan chiqarish ("Tahrirlash" → o'chirish →
// tasdiqlash).
//
// Eslatma: o'quvchi paroli (currentPassword) Firestore'da saqlanadi — ustoz
// istalgan payt uni jadvalda ko'ra olishi kerak (talab shunday). Bu odatiy
// "parolni hech qachon ochiq saqlama" qoidasidan chekinish, chunki bu
// akkountlarni ustoz o'zi o'z o'quvchilari uchun yaratadi va boshqaradi.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import Modal from "@/components/Modal";
import CredentialsCard from "@/components/CredentialsCard";
import { validateIsmFamiliya } from "@/lib/accountHelpers";
import { EyeIcon, EyeOffIcon, CopyIcon } from "@/components/icons";

export default function TeacherClassPage({ params }) {
  const { id } = params;
  const { user } = useTeacherAuth();

  const [classInfo, setClassInfo] = useState(undefined); // undefined=yuklanmoqda, null=topilmadi
  const [students, setStudents] = useState([]);

  const [showAdd, setShowAdd] = useState(false);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState(null);

  // Sinfni tekshirish: shu ustozga tegishlimi.
  useEffect(() => {
    let active = true;
    (async () => {
      const snap = await getDoc(doc(db, "classes", id));
      if (!active) return;
      if (!snap.exists() || snap.data().teacherId !== user.uid) {
        setClassInfo(null);
        return;
      }
      setClassInfo({ id: snap.id, ...snap.data() });
    })();
    return () => {
      active = false;
    };
  }, [id, user.uid]);

  // O'quvchilar ro'yxati (real vaqtda yangilanadi).
  useEffect(() => {
    if (!classInfo) return undefined;
    const q = query(
      collection(db, "users"),
      where("classId", "==", id),
      where("role", "==", "student")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => `${a.ism}${a.familiya}`.localeCompare(`${b.ism}${b.familiya}`, "uz"));
      setStudents(list);
    });
    return unsubscribe;
  }, [classInfo, id]);

  async function handleRemoveStudent(studentUid) {
    await updateDoc(doc(db, "users", studentUid), { classId: null });
    setConfirmRemoveUid(null);
  }

  if (classInfo === undefined) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-gray-400">Yuklanmoqda...</p>
      </main>
    );
  }

  if (classInfo === null) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-red-500">Sinf topilmadi.</p>
        <Link href="/teacher" className="mt-2 inline-block text-secondary underline">
          Sinflarga qaytish
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/teacher" className="text-sm text-secondary underline">
        ← Sinflar
      </Link>

      <div className="mb-6 mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{classInfo.nomi}</h1>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark"
        >
          + O&apos;quvchi qo&apos;shish
        </button>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500">Bu sinfda hali o&apos;quvchi yo&apos;q.</p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark"
          >
            Birinchi o&apos;quvchini qo&apos;shish
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Ism-Familiya</th>
                <th className="px-4 py-3 font-medium">Login</th>
                <th className="px-4 py-3 font-medium">Parol</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  onRequestRemove={() => setConfirmRemoveUid(s.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddStudentModal classId={id} onClose={() => setShowAdd(false)} />}

      {confirmRemoveUid && (
        <Modal title="Ishonchingiz komilmi?" onClose={() => setConfirmRemoveUid(null)}>
          <p className="mb-4 text-sm text-gray-600">
            O&apos;quvchi sinfdan chiqariladi (akkounti o&apos;chirilmaydi, faqat sinf
            bog&apos;lanishi uziladi).
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmRemoveUid(null)}
              className="flex-1 rounded-xl2 border border-gray-300 px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={() => handleRemoveStudent(confirmRemoveUid)}
              className="flex-1 rounded-xl2 bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600"
            >
              Ha, chiqarish
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function StudentRow({ student, onRequestRemove }) {
  const { user } = useTeacherAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  async function copy(value, field) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1200);
    } catch {
      // Clipboard mavjud bo'lmasa (masalan http muhitida) jim o'tkazamiz.
    }
  }

  async function handleResetPassword() {
    setResetError("");
    setResetting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/teacher/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ studentUid: student.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      // Firestore onSnapshot yangi parolni o'zi yetkazadi — foydalanuvchi
      // buni darhol ko'rishi uchun ochiq holatga o'tkazamiz.
      setShowPassword(true);
    } catch {
      setResetError("Parolni yangilab bo'lmadi");
    } finally {
      setResetting(false);
    }
  }

  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-3">
        {student.ism} {student.familiya}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono">{student.login}</span>
          <button
            type="button"
            onClick={() => copy(student.login, "login")}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Loginni nusxalash"
          >
            <CopyIcon />
          </button>
          {copiedField === "login" && <span className="text-xs text-primary">Nusxalandi!</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono">
            {student.currentPassword ? (showPassword ? student.currentPassword : "••••••••") : "—"}
          </span>
          {student.currentPassword && (
            <>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Yashirish" : "Ko'rsatish"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
              <button
                type="button"
                onClick={() => copy(student.currentPassword, "password")}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Parolni nusxalash"
              >
                <CopyIcon />
              </button>
              {copiedField === "password" && (
                <span className="text-xs text-primary">Nusxalandi!</span>
              )}
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetting}
            className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            {resetting ? "..." : "Yangi parol yarat"}
          </button>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Tahrirlash
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onRequestRemove}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
              >
                O&apos;chirish
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs text-gray-400 underline"
              >
                Bekor
              </button>
            </>
          )}
        </div>
        {resetError && <p className="mt-1 text-xs text-red-500">{resetError}</p>}
      </td>
    </tr>
  );
}

function AddStudentModal({ classId, onClose }) {
  const { user } = useTeacherAuth();
  const [ism, setIsm] = useState("");
  const [familiya, setFamiliya] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { login, password }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    const nextErrors = {};
    const ismCheck = validateIsmFamiliya(ism);
    if (!ismCheck.valid) nextErrors.ism = ismCheck.error;
    const familiyaCheck = validateIsmFamiliya(familiya);
    if (!familiyaCheck.valid) nextErrors.familiya = familiyaCheck.error;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ ism, familiya, classId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setResult({ login: data.login, password: data.password });
    } catch (err) {
      setFormError(err.message || "O'quvchi qo'shishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <Modal title="O'quvchi qo'shildi 🎉" onClose={onClose}>
        <p className="mb-3 text-sm text-gray-600">
          Login va parolni o&apos;quvchiga bering — bu ro&apos;yxatda istalgan payt qayta
          ko&apos;rishingiz mumkin.
        </p>
        <CredentialsCard login={result.login} password={result.password} />
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark"
        >
          Yopish
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="O'quvchi qo'shish" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <input
            type="text"
            placeholder="Ism"
            value={ism}
            onChange={(e) => setIsm(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-4 py-3"
            autoFocus
          />
          {errors.ism && <p className="mt-1 text-sm text-red-500">{errors.ism}</p>}
        </div>
        <div>
          <input
            type="text"
            placeholder="Familiya"
            value={familiya}
            onChange={(e) => setFamiliya(e.target.value)}
            className="w-full rounded-xl2 border border-gray-300 px-4 py-3"
          />
          {errors.familiya && <p className="mt-1 text-sm text-red-500">{errors.familiya}</p>}
        </div>
        {formError && <p className="text-sm text-red-500">{formError}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? "Qo'shilmoqda..." : "Qo'shish"}
        </button>
      </form>
    </Modal>
  );
}
