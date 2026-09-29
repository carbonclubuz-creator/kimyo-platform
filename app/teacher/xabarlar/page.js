"use client";

// app/teacher/xabarlar/page.js
// Ustoz Xabarlar (inbox) sahifasi (0-QISM 7-band): barcha so'rovlar aralash
// ro'yxatda, oxirgi kelgani birinchi. Ikki tur:
//   - Sinfga qo'shilish so'rovi: "Qabul" / "Rad".
//   - Parolni tiklash so'rovi: "Yangilash" (yangi parol bir marta ko'rsatiladi,
//     nusxalash bilan) + "Bajarildi" (xabarni ro'yxatdan olib tashlaydi).

import { useCallback, useEffect, useState } from "react";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import CredentialsCard from "@/components/CredentialsCard";
import BackLink from "@/components/BackLink";

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
      setXabarlar(data.xabarlar || []);
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
        {xabarlar?.map((x) => (
          <XabarKarta
            key={x.id}
            xabar={x}
            onOzgardi={() => {
              yukla();
              xabarlarOzgardi();
            }}
          />
        ))}
      </div>
    </main>
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
