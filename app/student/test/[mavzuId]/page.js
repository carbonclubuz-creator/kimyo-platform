"use client";

// app/student/test/[mavzuId]/page.js
// Test ishlash sahifasi — endi Firestore bilan to'g'ridan-to'g'ri
// gaplashmaydi, faqat /api/student/test/start va /api/student/test/answer
// bilan ishlaydi. MUHIM: server hech qachon to'g'ri javobni oldindan
// yubormaydi — faqat javob berilgandan KEYIN shu savol uchun natija keladi
// (0-QISM 7-10-band talablari saqlanadi, endi xavfsiz tarzda).
//
// 5B: tepada progress bar (components/TestProgress.js) va motivatsion
// toast'lar (components/Toast.js): yangi test boshlanganda, savollarning 50%i
// javoblanganda va natija ekraniga o'tganda — har biri bir urinishda FAQAT
// bir marta. Testni davom ettirishda boshlanish toasti chiqmaydi, allaqachon
// o'tilgan 50% belgisi uchun ham chiqmaydi. API o'zgarmagan.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStudentAuth } from "@/app/student/AuthProvider";
import BackLink from "@/components/BackLink";
import Toast from "@/components/Toast";
import TestProgress from "@/components/TestProgress";
import { yarmiChegarasi } from "@/lib/testToast";

const TOAST_BOSHLANISH = "Hamma ham boshlay olmaydi";
const TOAST_YARMI = "Hamma ham yarmiga yetolmaydi";
const TOAST_TUGASH = "Hamma ham tugatolmaydi";

// Toast tashqi qobiqda turadi — test fazalari (natija ekrani ham) almashganda ham
// yo'qolib qolmasligi uchun.
export default function StudentTestPage({ params }) {
  const [toast, setToast] = useState(null);
  return (
    <>
      <Toast xabar={toast} onYoqol={() => setToast(null)} />
      <StudentTestIchki params={params} toastKorsat={setToast} />
    </>
  );
}

function StudentTestIchki({ params, toastKorsat }) {
  const { mavzuId } = params;
  const { user, refreshHearts } = useStudentAuth();

  // Har toast bir urinishda faqat bir marta: "urinishId:tur" kalitlari.
  const korsatilgan = useRef(new Set());
  function birMartaToast(urinish, tur, matn) {
    const kalit = `${urinish}:${tur}`;
    if (korsatilgan.current.has(kalit)) return;
    korsatilgan.current.add(kalit);
    if (matn) toastKorsat(matn);
  }

  // "checking" | "no-hearts" | "resume-prompt" | "empty" | "test" | "result" | "error"
  const [phase, setPhase] = useState("checking");

  const [urinishId, setUrinishId] = useState(null);
  const [savollar, setSavollar] = useState([]); // [{savolId, matn, variantlar}]
  const [joriyIndex, setJoriyIndex] = useState(0);
  const [togriSoni, setTogriSoni] = useState(0);
  const [jamiSavol, setJamiSavol] = useState(0);
  const [wasResumed, setWasResumed] = useState(false);

  const [tanlangan, setTanlangan] = useState(null); // bosilgan displey-indeks
  const [natija, setNatija] = useState(null); // { togrimi, togriDisplayIndex } — javob yuborilgach
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  // Start so'rovi mavzu uchun BIR MARTA yuboriladi. React Strict Mode (dev)
  // effektni ikki marta ishga tushiradi; ikkalasi shu bitta so'rov natijasini
  // kutadi. Aks holda ikkinchi so'rov birinchi yaratgan urinishni "davom
  // ettirish" deb qaytarardi va headerdagi jon yangilanmay qolardi.
  const startSorovi = useRef(null); // { mavzuId, promise }

  useEffect(() => {
    let bekor = false;

    async function startSoroviniYubor() {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/student/test/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ mavzuId }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    }

    async function boshlash() {
      try {
        if (!startSorovi.current || startSorovi.current.mavzuId !== mavzuId) {
          startSorovi.current = { mavzuId, promise: startSoroviniYubor() };
        }
        const { ok: resOk, data } = await startSorovi.current.promise;
        if (bekor) return;

        if (!resOk) {
          setPhase("error");
          return;
        }
        if (!data.ok) {
          setPhase(data.reason === "no-hearts" ? "no-hearts" : "empty");
          return;
        }

        setUrinishId(data.urinishId);
        setSavollar(data.savollar);
        setJoriyIndex(data.joriyIndex);
        setTogriSoni(data.togriSoni);
        setJamiSavol(data.jamiSavol);
        setWasResumed(data.resumed);

        if (data.resumed) {
          // Davom ettirish: boshlanish toasti chiqmaydi va allaqachon o'tilgan
          // 50% belgisi uchun ham chiqmaydi (belgilab qo'yamiz).
          korsatilgan.current.add(`${data.urinishId}:boshlanish`);
          const chegara = yarmiChegarasi(data.jamiSavol);
          if (chegara !== null && data.joriyIndex >= chegara) {
            korsatilgan.current.add(`${data.urinishId}:yarmi`);
          }
          setPhase("resume-prompt");
        } else {
          refreshHearts(); // 1 jon kamaydi — headerdagi ko'rsatkichni yangilaymiz
          setPhase("test");
          birMartaToast(data.urinishId, "boshlanish", TOAST_BOSHLANISH);
        }
      } catch {
        if (!bekor) setPhase("error");
      }
    }

    boshlash();
    return () => {
      bekor = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mavzuId, user]);

  function davomEttirish() {
    setPhase("test");
  }

  async function javobTanlash(displeyIndeks) {
    if (tanlangan !== null || yuborilmoqda) return;
    setTanlangan(displeyIndeks);
    setYuborilmoqda(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/student/test/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          urinishId,
          savolIndex: joriyIndex,
          tanlanganDisplayIndex: displeyIndeks,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setPhase("error");
        return;
      }
      setNatija(data);
      setTogriSoni(data.togriSoni);
      // Javob berilgan savollar soni = joriyIndex + 1; 50% ga yetganda bir marta.
      if (joriyIndex + 1 === yarmiChegarasi(data.jamiSavol)) {
        birMartaToast(urinishId, "yarmi", TOAST_YARMI);
      }
    } catch {
      setPhase("error");
    } finally {
      setYuborilmoqda(false);
    }
  }

  function keyingisi() {
    if (natija?.oxirgimi) {
      setPhase("result");
      birMartaToast(urinishId, "tugash", TOAST_TUGASH);
      return;
    }
    setJoriyIndex((i) => i + 1);
    setTanlangan(null);
    setNatija(null);
  }

  if (phase === "checking") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">Yuklanmoqda...</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-gray-600">Nimadir xato ketdi. Qaytadan urinib ko&apos;ring.</p>
        <Link href="/student" className="text-primary hover:underline">
          ← Mavzularga qaytish
        </Link>
      </main>
    );
  }

  if (phase === "empty") {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-gray-600">Bu mavzuda hali savollar yo&apos;q.</p>
        <Link href="/student" className="text-primary hover:underline">
          ← Mavzularga qaytish
        </Link>
      </main>
    );
  }

  if (phase === "no-hearts") {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="mb-2 text-5xl">🖤</p>
        <p className="mb-4 text-gray-600">
          Bugungi jonlaringiz tugadi, ertaga soat 7:00da yangilanadi.
        </p>
        <Link href="/student" className="text-primary hover:underline">
          ← Mavzularga qaytish
        </Link>
      </main>
    );
  }

  if (phase === "resume-prompt") {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-gray-600">
          Sizda bu mavzu bo&apos;yicha tugallanmagan test bor. Davom ettirasizmi?
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/student"
            className="rounded-xl2 border border-gray-300 px-4 py-2.5 text-gray-600 hover:bg-gray-100"
          >
            Orqaga
          </Link>
          <button
            type="button"
            onClick={davomEttirish}
            className="rounded-xl2 bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-dark"
          >
            Davom ettirish
          </button>
        </div>
      </main>
    );
  }

  if (phase === "result") {
    const foiz = jamiSavol ? Math.round((togriSoni / jamiSavol) * 100) : 0;
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold">Natija</h1>
        <p className="mb-6 text-5xl font-bold text-primary">{foiz}%</p>
        <p className="mb-6 text-gray-600">
          {togriSoni}/{jamiSavol} to&apos;g&apos;ri
        </p>
        <Link
          href="/student"
          className="rounded-xl2 bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-dark"
        >
          Mavzularga qaytish
        </Link>
      </main>
    );
  }

  // phase === "test"
  const savol = savollar[joriyIndex];
  const javobBerilgan = natija !== null;

  return (
    <main className="mx-auto max-w-lg p-6">
      <BackLink href="/student">Mavzular</BackLink>
      <TestProgress
        javobBerilgan={joriyIndex + (javobBerilgan ? 1 : 0)}
        jami={savollar.length}
      />
      <p className="mb-4 text-sm text-gray-400">
        Savol {joriyIndex + 1} / {savollar.length}
      </p>
      <h1 className="mb-6 text-xl font-semibold">{savol?.matn}</h1>

      <div className="flex flex-col gap-3">
        {savol?.variantlar.map((matn, displeyIndeks) => {
          let holatClass = "border-gray-200 bg-white hover:border-secondary";

          if (javobBerilgan) {
            if (displeyIndeks === natija.togriDisplayIndex) {
              holatClass = "border-primary bg-primary/10 text-primary";
            } else if (displeyIndeks === tanlangan) {
              holatClass = "border-red-400 bg-red-50 text-red-500";
            } else {
              holatClass = "border-gray-200 bg-white opacity-60";
            }
          }

          return (
            <button
              key={displeyIndeks}
              type="button"
              disabled={javobBerilgan || yuborilmoqda}
              onClick={() => javobTanlash(displeyIndeks)}
              className={`rounded-xl2 border px-4 py-3 text-left font-medium transition ${holatClass}`}
            >
              {matn}
            </button>
          );
        })}
      </div>

      {javobBerilgan && (
        <button
          type="button"
          onClick={keyingisi}
          className="mt-6 w-full rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark"
        >
          Keyingisi
        </button>
      )}
    </main>
  );
}
