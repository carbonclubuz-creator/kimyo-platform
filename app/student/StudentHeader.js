"use client";

// app/student/StudentHeader.js
// O'quvchi paneli yuqori paneli: BirKuch logotipi, qolgan jonlar
// (gorizontal qatorda: "❤️❤️❤️🖤🖤 3/5"), ism-familiya va navigatsiya
// tugmalari (Reyting, Akkount). "Chiqish" bu yerda YO'Q — u ataylab
// Akkount > Tahrirlash ichida turadi (tasodifan bosib yubormaslik uchun).
//
// Telefonda joy tor: 1-qatorda logotip + jonlar, 2-qatorda ism va tugmalar.
// Kompyuterda hammasi bitta qatorda.

import Link from "next/link";
import { useStudentAuth } from "@/app/student/AuthProvider";

const tugmaClass =
  "shrink-0 whitespace-nowrap rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100";

export default function StudentHeader() {
  const { userData, qolganJon, jamiJon } = useStudentAuth();
  // Bonus bilan jami jon 10 tagacha ko'tarilishi mumkin — yuraklar shu bilan cheklanadi,
  // to'liq son title va matnda ko'rsatiladi.
  const KO_RSATISH_MAX = 10;
  const yuraklarSoni = Math.min(jamiJon, KO_RSATISH_MAX);

  return (
    <header className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap">
        <Link href="/student" className="text-lg font-bold text-primary">
          BirKuch
        </Link>

        <span
          className="ml-auto flex items-center gap-2 whitespace-nowrap text-sm sm:ml-0"
          title={`${qolganJon}/${jamiJon} jon qoldi`}
        >
          <span className="flex flex-row flex-nowrap gap-0.5" aria-hidden="true">
            {Array.from({ length: yuraklarSoni }, (_, i) => (
              <span key={i}>{i < qolganJon ? "❤️" : "🖤"}</span>
            ))}
          </span>
          <span className="text-gray-400">
            {qolganJon}/{jamiJon}
          </span>
          <span className="sr-only">jon qoldi</span>
        </span>

        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-4">
          <span className="max-w-full truncate text-sm text-gray-600">
            {userData?.ism} {userData?.familiya}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {!userData?.classId && (
              <Link href="/student/join" className={tugmaClass}>
                Sinfga qo&apos;shilish
              </Link>
            )}
            <Link href="/student/rating" className={tugmaClass}>
              Reyting
            </Link>
            <Link href="/student/account" className={tugmaClass}>
              Akkount
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
