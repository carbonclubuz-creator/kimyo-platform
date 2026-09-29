"use client";

// app/teacher/class/[id]/ChopEtish.js
// Sinf sahifasidagi "Chop etish (PDF)" tugmasi: shu sinfning barcha
// o'quvchilari uchun 3×5 login/parol varaqchalari PDF'i. Faqat
// `currentPassword` bor o'quvchilar kiradi (hashteg orqali qo'shilganlarning
// parolini ustoz bilmaydi) — nechtasi o'tkazib yuborilgani ustozga aytiladi.
// Ma'lumot manbai: sinf sahifasidagi mavjud `students` holati.

import { useState } from "react";
import { varaqchalarPdf } from "@/lib/pdfVaraqchalar";

export default function ChopEtishTugmasi({ students, sinfNomi }) {
  const [band, setBand] = useState(false);
  const [xabar, setXabar] = useState(null); // { tur: "xato" | "malumot", matn }

  async function chop() {
    setXabar(null);
    const royxat = students
      .filter((s) => s.currentPassword)
      .map((s) => ({ ism: s.ism, familiya: s.familiya, login: s.login, parol: s.currentPassword }));
    const otkazilgan = students.length - royxat.length;

    if (royxat.length === 0) {
      setXabar({
        tur: "xato",
        matn: "Chop etish uchun o'quvchi yo'q — hech kimning paroli ma'lum emas (hashteg orqali qo'shilganlar).",
      });
      return;
    }

    setBand(true);
    try {
      const n = await varaqchalarPdf({ sinfNomi, royxat });
      setXabar({
        tur: "malumot",
        matn:
          `${n.varaqchalarSoni} ta varaqcha (${n.sahifalarSoni} sahifa) tayyorlandi.` +
          (otkazilgan > 0
            ? ` ${otkazilgan} ta o'quvchi hashteg orqali qo'shilgan — ularning paroli yo'q, varaqchaga kiritilmadi.`
            : ""),
      });
    } catch (err) {
      setXabar({ tur: "xato", matn: err.message || "PDF yaratib bo'lmadi" });
    } finally {
      setBand(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={chop}
        disabled={band || students.length === 0}
        className="rounded-xl2 border border-gray-300 px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
      >
        {band ? "Tayyorlanmoqda..." : "Chop etish (PDF)"}
      </button>
      {xabar && (
        <p
          className={`basis-full text-sm ${xabar.tur === "xato" ? "text-red-500" : "text-gray-600"}`}
          role="status"
        >
          {xabar.matn}
        </p>
      )}
    </>
  );
}
