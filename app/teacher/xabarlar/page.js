"use client";

// app/teacher/xabarlar/page.js
// Ustoz Xabarlar (inbox) sahifasi (0-QISM 7-band): barcha so'rovlar aralash
// ro'yxatda, oxirgi kelgani birinchi. Ikki tur:
//   - Sinfga qo'shilish so'rovi: "Qabul" / "Rad".
//   - Parolni tiklash so'rovi: "Yangilash" (yangi parol bir marta ko'rsatiladi,
//     nusxalash bilan) + "Bajarildi" (xabarni ro'yxatdan olib tashlaydi).
//   - Adminning javobi ("Admin" belgisi bilan): o'zi o'chib ketmaydi, ustoz
//     xohlasa "O'chirish" bilan o'zi olib tashlaydi.

import { useCallback, useEffect, useState } from "react";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import CredentialsCard from "@/components/CredentialsCard";
import BackLink from "@/components/BackLink";
import Modal from "@/components/Modal";

function xabarlarOzgardi() {
  window.dispatchEvent(new Event("xabarlar-ozgardi"));
}

export default function TeacherInboxPage() {
  const { user } = useTeacherAuth();
  const [xabarlar, setXabarlar] = useState(null); // null = yuklanmoqda
  const [xato, setXato] = useState("");

  const yukla = useCallback(async () => {
    setXato("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/teacher/messages", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      const royxat = data.xabarlar || [];
      setXabarlar(royxat);
      // Yangi admin javoblari endi o'qilgan — yuqori paneldagi qizil belgi yangilansin.
      if (royxat.some((x) => x.tur === "admin_javob" && !x.oqilgan)) xabarlarOzgardi();
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    }
  }, [user]);

  useEffect(() => {
    yukla();
  }, [yukla]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <BackLink href="/teacher" />
      <h1 className="mb-6 text-2xl font-bold">Xabarlar</h1>

      {xato && <p className="mb-4 text-sm text-red-500">{xato}</p>}
      {xabarlar === null && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}
      {xabarlar !== null && xabarlar.length === 0 && (
        <p className="text-gray-500">Yangi xabarlar yo&apos;q.</p>
      )}

      <div className="flex flex-col gap-3">
        {xabarlar?.map((x) =>
          x.tur === "admin_javob" ? (
            <AdminJavobKarta
              key={x.id}
              xabar={x}
              onOzgardi={() => {
                yukla();
                xabarlarOzgardi();
              }}
            />
          ) : (
            <XabarKarta
              key={x.id}
              xabar={x}
              onOzgardi={() => {
                yukla();
                xabarlarOzgardi();
              }}
            />
          )
        )}
      </div>
    </main>
  );
}

/** Adminning javobi: "Admin" belgisi bilan; faqat ustozning o'zi o'chiradi. */
function AdminJavobKarta({ xabar, onOzgardi }) {
  const { user } = useTeacherAuth();
  const [tasdiq, setTasdiq] = useState(false);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");

  async function ochirish() {
    setXato("");
    setBand(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/teacher/messages/${xabar.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        if (res.status === 404) onOzgardi();
        return;
      }
      setTasdiq(false);
      onOzgardi();
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setBand(false);
    }
  }

  return (
    <div
      className={`rounded-xl2 border bg-white p-4 ${
        xabar.oqilgan ? "border-gray-200" : "border-primary"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
          Admin
        </span>
        {!xabar.oqilgan && <span className="text-xs font-semibold text-primary-dark">Yangi</span>}
        <span className="ml-auto text-xs text-gray-400">
          {xabar.vaqt ? new Date(xabar.vaqt).toLocaleString("uz-UZ") : ""}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words text-gray-800">{xabar.matn}</p>

      {xabar.asliMatn && (
        <p className="mt-3 border-l-2 border-gray-200 pl-3 text-xs text-gray-400">
          Sizning xabaringiz: {xabar.asliMatn}
        </p>
      )}

      {xato && <p className="mt-2 text-sm text-red-500">{xato}</p>}

      <button
        type="button"
        onClick={() => setTasdiq(true)}
        className="mt-3 rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        O&apos;chirish
      </button>

      {tasdiq && (
        <Modal title="Ishonchingiz komilmi?" onClose={() => setTasdiq(false)}>
          <p className="mb-4 text-sm text-gray-600">
            Admin javobi Xabarlaringizdan o&apos;chiriladi. Buni qaytarib bo&apos;lmaydi.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTasdiq(false)}
              className="flex-1 rounded-xl2 border border-gray-300 px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={band}
              onClick={ochirish}
              className="flex-1 rounded-xl2 bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {band ? "..." : "Ha, o'chirish"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function XabarKarta({ xabar, onOzgardi }) {
  const { user } = useTeacherAuth();
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");
  const [yangiParol, setYangiParol] = useState(null); // { login, parol }

  const sarlavha =
    xabar.tur === "sinfga_qoshilish"
      ? `Sinfga qo'shilish so'rovi — ${xabar.classNomi}`
      : `Parolni tiklash so'rovi — ${xabar.classNomi}`;

  async function amalBajar(amal) {
    setXato("");
    setBand(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/teacher/messages/${xabar.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ amal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        // Eskirgan xabar serverda o'chirilgan bo'lishi mumkin — ro'yxatni yangilaymiz.
        if (res.status === 409 || res.status === 404) onOzgardi();
        return;
      }
      if (amal === "yangilash") {
        setYangiParol({ login: data.login, parol: data.parol });
        return; // xabar "Bajarildi" bosilguncha ro'yxatda qoladi
      }
      onOzgardi();
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setBand(false);
    }
  }

  const tugma = "rounded-xl2 px-4 py-2 text-sm font-semibold disabled:opacity-60";

  return (
    <div className="rounded-xl2 border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-400">
        {xabar.vaqt ? new Date(xabar.vaqt).toLocaleString("uz-UZ") : ""}
      </p>
      <p className="mt-1 font-semibold">
        {xabar.studentIsm} {xabar.studentFamiliya}
      </p>
      <p className="mb-3 text-sm text-gray-500">{sarlavha}</p>

      {yangiParol && (
        <div className="mb-3">
          <p className="mb-2 text-sm text-gray-600">
            Yangi parol yaratildi — o&apos;quvchiga yetkazing. U faqat shu yerda ko&apos;rsatiladi.
          </p>
          <CredentialsCard login={yangiParol.login} password={yangiParol.parol} />
        </div>
      )}

      {xato && <p className="mb-2 text-sm text-red-500">{xato}</p>}

      <div className="flex gap-2">
        {xabar.tur === "sinfga_qoshilish" && (
          <>
            <button
              type="button"
              disabled={band}
              onClick={() => amalBajar("qabul")}
              className={`${tugma} bg-primary text-white hover:bg-primary-dark`}
            >
              Qabul
            </button>
            <button
              type="button"
              disabled={band}
              onClick={() => amalBajar("rad")}
              className={`${tugma} border border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Rad
            </button>
          </>
        )}
        {xabar.tur === "parol_tiklash" && (
          <>
            {!yangiParol && (
              <button
                type="button"
                disabled={band}
                onClick={() => amalBajar("yangilash")}
                className={`${tugma} bg-primary text-white hover:bg-primary-dark`}
              >
                {band ? "..." : "Yangilash"}
              </button>
            )}
            <button
              type="button"
              disabled={band}
              onClick={() => amalBajar("bajarildi")}
              className={`${tugma} border border-gray-300 text-gray-600 hover:bg-gray-50`}
            >
              Bajarildi
            </button>
          </>
        )}
      </div>
    </div>
  );
}
