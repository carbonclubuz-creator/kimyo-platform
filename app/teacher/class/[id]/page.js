"use client";

// app/teacher/class/[id]/page.js
// Sinf ichi sahifasi. Yuqorida ikki bo'lim: "O'quvchilar" (shu sinfga
// tegishli o'quvchilar ro'yxati: Ism-Familiya, Login, Parol — ko'z
// ikonkasi bilan yashirin/ko'rsatilgan, nusxalash tugmasi; "O'quvchi
// qo'shish", "Ko'plab qo'shish", "Chop etish (PDF)", har bir qator uchun
// "Yangi parol yarat" va sinfdan chiqarish) va "Statistika" (3-bosqich —
// ClassStats.js). Bo'lim va statistika filtri URL query'da saqlanadi
// (?bolim=statistika&davr=...&mavzuId=...), shu sabab individual o'quvchi
// sahifasidan "Orqaga" qaytganda tab holati saqlanadi.
//
// Eslatma: o'quvchi paroli (currentPassword) Firestore'da saqlanadi — ustoz
// istalgan payt uni jadvalda ko'ra olishi kerak (talab shunday). Bu odatiy
// "parolni hech qachon ochiq saqlama" qoidasidan chekinish, chunki bu
// akkountlarni ustoz o'zi o'z o'quvchilari uchun yaratadi va boshqaradi.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import {
  LoginQiymati,
  ParolQiymati,
  ParolYangilashTugmasi,
  useOquvchiAkkount,
} from "@/components/OquvchiAkkount";
import BackLink from "@/components/BackLink";
import ClassStats from "./ClassStats";
import ChopEtishTugmasi from "./ChopEtish";

const BOLIMLAR = [
  { key: "oquvchilar", label: "O'quvchilar" },
  { key: "statistika", label: "Statistika" },
];
const DAVRLAR = ["haftalik", "bugungi", "kechagi", "umumiy", "mavzu"];

/** Bo'lim + statistika filtrini brauzer manziliga (qayta yuklamasdan) yozadi. */
function manzilniYangila(bolim, davr, mavzuId) {
  const p = new URLSearchParams();
  if (bolim === "statistika") {
    p.set("bolim", "statistika");
    if (davr) p.set("davr", davr);
    if (davr === "mavzu" && mavzuId) p.set("mavzuId", mavzuId);
  }
  const qs = p.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

export default function TeacherClassPage({ params }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-6">
          <p className="text-gray-400">Yuklanmoqda...</p>
        </main>
      }
    >
      <TeacherClassPageIchki params={params} />
    </Suspense>
  );
}

function TeacherClassPageIchki({ params }) {
  const { id } = params;
  const { user } = useTeacherAuth();
  const qidiruv = useSearchParams();

  // Bo'lim va statistika filtrining boshlang'ich qiymati URL'dan olinadi.
  const [bolim, setBolim] = useState(
    qidiruv.get("bolim") === "statistika" ? "statistika" : "oquvchilar"
  );
  const boshlangichDavr = DAVRLAR.includes(qidiruv.get("davr")) ? qidiruv.get("davr") : "haftalik";
  const boshlangichMavzuId = qidiruv.get("mavzuId") || "";

  const [classInfo, setClassInfo] = useState(undefined); // undefined=yuklanmoqda, null=topilmadi
  const [students, setStudents] = useState([]);

  const [showAdd, setShowAdd] = useState(false);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState(null);
  const [hashtegCopied, setHashtegCopied] = useState(false);

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

  // Hashtegi hali yo'q (hashteg joriy etilgunga qadar yaratilgan) sinfga
  // server noyob hashteg beradi.
  useEffect(() => {
    if (!classInfo || classInfo.hashteg) return;
    let active = true;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/teacher/classes", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ classId: id }),
        });
        const data = await res.json().catch(() => ({}));
        if (active && res.ok && data.hashteg) {
          setClassInfo((c) => (c ? { ...c, hashteg: data.hashteg } : c));
        }
      } catch {
        // jim — hashteg keyingi ochilishda qayta uriniladi
      }
    })();
    return () => {
      active = false;
    };
  }, [classInfo, id, user]);

  async function copyHashteg() {
    try {
      await navigator.clipboard.writeText(classInfo.hashteg);
      setHashtegCopied(true);
      setTimeout(() => setHashtegCopied(false), 1500);
    } catch {
      // Clipboard mavjud bo'lmasa jim o'tkazamiz.
    }
  }

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
      <BackLink href="/teacher" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{classInfo.nomi}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark"
          >
            + O&apos;quvchi qo&apos;shish
          </button>
          <Link
            href={`/teacher/class/${id}/ommaviy`}
            className="rounded-xl2 border border-primary px-4 py-2.5 font-semibold text-primary-dark hover:bg-primary/10"
          >
            Ko&apos;plab qo&apos;shish
          </Link>
          <ChopEtishTugmasi students={students} sinfNomi={classInfo.nomi} />
        </div>
      </div>

      {classInfo.hashteg && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl2 border border-gray-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Sinf hashtegi</p>
            <p className="font-mono text-xl font-semibold text-gray-900">#{classInfo.hashteg}</p>
            <p className="mt-1 text-xs text-gray-400">
              Mustaqil o&apos;quvchi shu kod bilan sinfga qo&apos;shilish so&apos;rovi yuboradi
              (Xabarlar bo&apos;limiga tushadi).
            </p>
          </div>
          <button
            type="button"
            onClick={copyHashteg}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            {hashtegCopied ? "Nusxalandi!" : "Nusxalash"}
          </button>
        </div>
      )}

      {/* Bo'lim almashtirgichi: O'quvchilar | Statistika */}
      <div className="mb-4 grid grid-cols-2 gap-1" role="tablist" aria-label="Sinf bo'limi">
        {BOLIMLAR.map((b) => (
          <button
            key={b.key}
            type="button"
            role="tab"
            aria-selected={bolim === b.key}
            onClick={() => {
              setBolim(b.key);
              manzilniYangila(b.key, boshlangichDavr, boshlangichMavzuId);
            }}
            className={`rounded-xl2 px-4 py-2.5 text-base font-bold transition ${
              bolim === b.key
                ? "bg-secondary text-white"
                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {bolim === "statistika" && (
        <ClassStats
          classId={id}
          boshlangichDavr={boshlangichDavr}
          boshlangichMavzuId={boshlangichMavzuId}
          onOzgarish={(davr, mavzuId) => manzilniYangila("statistika", davr, mavzuId)}
        />
      )}

      {bolim === "oquvchilar" && (students.length === 0 ? (
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
      ))}

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
  const h = useOquvchiAkkount(student, user);
  const [editing, setEditing] = useState(false);

  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-3">
        <Link
          href={`/teacher/class/${student.classId}/student/${student.id}?davr=haftalik`}
          className="hover:text-secondary hover:underline"
        >
          {student.ism} {student.familiya}
        </Link>
      </td>
      <td className="px-4 py-3">
        <LoginQiymati student={student} h={h} />
      </td>
      <td className="px-4 py-3">
        <ParolQiymati student={student} h={h} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <ParolYangilashTugmasi student={student} h={h} />
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
        {h.resetError && <p className="mt-1 text-xs text-red-500">{h.resetError}</p>}
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
