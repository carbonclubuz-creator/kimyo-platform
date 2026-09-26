"use client";

// app/student/test/[mavzuId]/page.js
// Test ishlash sahifasi (0-QISM 7-10-band):
// - Agar bugungi jon 0 bo'lsa VA shu mavzuda "jarayonda" urinish yo'q bo'lsa
//   — test boshlanmaydi, xabar ko'rsatiladi.
// - Agar "jarayonda" (tugallanmagan) urinish bo'lsa — davom ettirish taklif
//   qilinadi, jon qayta olinmaydi.
// - Aks holda: savollar va har savolning 4 varianti tasodifiy tartibda
//   olinadi, yangi urinish yoziladi, 1 ta jon kamayadi.
// - Har savolga javob berilgach darhol to'g'ri/noto'g'ri rangda ko'rsatiladi;
//   "Keyingisi" faqat javob berilgach ko'rinadi. Har javobdan keyin urinish
//   hujjati Firestore'da yangilanadi (shuning uchun yarim yo'lda chiqib
//   ketilsa ham progress saqlanadi).
// - Oxirgi savoldan keyin natija ekrani: "X/Y to'g'ri (Z%)".

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStudentAuth } from "@/app/student/AuthProvider";
import { KUNLIK_JON_SONI, jonHujjatId, jonSanasi } from "@/lib/heartsHelpers";

/** Fisher-Yates aralashtirish — massivni o'zgartirmaydi, yangisini qaytaradi. */
function aralashtir(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudentTestPage({ params }) {
  const { mavzuId } = params;
  const { user } = useStudentAuth();

  // "checking" | "no-hearts" | "resume-prompt" | "empty" | "test" | "result" | "error"
  const [phase, setPhase] = useState("checking");
  const [mavzu, setMavzu] = useState(null);
  const [urinishId, setUrinishId] = useState(null);
  const [savolTartibi, setSavolTartibi] = useState([]); // savol ID'lari, tasodifiy tartibda
  const [variantTartiblari, setVariantTartiblari] = useState({}); // { [savolId]: [origIdx,...] }
  const [savollarMap, setSavollarMap] = useState({}); // { [savolId]: savolHujjati }
  const [javoblar, setJavoblar] = useState([]); // har savol uchun TANLANGAN ASL indeks (0-3)
  const [togriSoni, setTogriSoni] = useState(0);
  const [tanlangan, setTanlangan] = useState(null); // joriy savolda bosilgan displey-indeks
  const [pendingUrinish, setPendingUrinish] = useState(null); // resume-prompt uchun

  useEffect(() => {
    let bekor = false;

    async function boshlash() {
      try {
        const mavzuSnap = await getDoc(doc(db, "mavzular", mavzuId));
        if (bekor) return;
        if (!mavzuSnap.exists()) {
          setPhase("error");
          return;
        }
        setMavzu({ id: mavzuSnap.id, ...mavzuSnap.data() });

        // Composite index shart bo'lmasligi uchun faqat studentId bo'yicha
        // so'raymiz, qolganini client tarafda filtrlaymiz.
        const urinishlarSnap = await getDocs(
          query(collection(db, "urinishlar"), where("studentId", "==", user.uid))
        );
        const jarayonda = urinishlarSnap.docs.find((d) => {
          const u = d.data();
          return u.mavzuId === mavzuId && u.holati === "jarayonda";
        });

        if (bekor) return;

        if (jarayonda) {
          setPendingUrinish({ id: jarayonda.id, ...jarayonda.data() });
          setPhase("resume-prompt");
          return;
        }

        // StudentHeader'dagi Context qiymati (onSnapshot) biroz kechikishi
        // mumkin bo'lgani uchun, kritik qaror (jon bormi?) uchun to'g'ridan-to'g'ri
        // Firestore'dan yangi qiymat o'qiladi.
        const sanaTekshir = jonSanasi();
        const jonSnap = await getDoc(doc(db, "jonlar", jonHujjatId(user.uid, sanaTekshir)));
        const ishlatilgan = jonSnap.exists() ? jonSnap.data().ishlatilgan || 0 : 0;
        if (bekor) return;
        if (KUNLIK_JON_SONI - ishlatilgan <= 0) {
          setPhase("no-hearts");
          return;
        }

        const savollarSnap = await getDocs(
          query(collection(db, "savollar"), where("mavzuId", "==", mavzuId))
        );
        if (bekor) return;

        if (savollarSnap.empty) {
          setPhase("empty");
          return;
        }

        const savollar = savollarSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const tartib = aralashtir(savollar.map((s) => s.id));
        const variantlar = {};
        const map = {};
        savollar.forEach((s) => {
          variantlar[s.id] = aralashtir([0, 1, 2, 3]);
          map[s.id] = s;
        });

        const yangiUrinish = {
          studentId: user.uid,
          mavzuId,
          boshlanganVaqt: serverTimestamp(),
          holati: "jarayonda",
          togriSoni: 0,
          jamiSavol: tartib.length,
          javoblar: [],
          savolTartibi: tartib,
          variantTartiblari: variantlar,
        };
        const urinishRef = await addDoc(collection(db, "urinishlar"), yangiUrinish);

        // Jon kamaytirish — faqat YANGI test boshlaganda (davom ettirishda emas).
        const sana = jonSanasi();
        await setDoc(
          doc(db, "jonlar", jonHujjatId(user.uid, sana)),
          { studentId: user.uid, sana, ishlatilgan: increment(1) },
          { merge: true }
        );

        if (bekor) return;
        setUrinishId(urinishRef.id);
        setSavolTartibi(tartib);
        setVariantTartiblari(variantlar);
        setSavollarMap(map);
        setJavoblar([]);
        setTogriSoni(0);
        setPhase("test");
      } catch {
        if (!bekor) setPhase("error");
      }
    }

    boshlash();
    return () => {
      bekor = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mavzuId, user.uid]);

  async function davomEttirish() {
    if (!pendingUrinish) return;
    setPhase("checking");
    try {
      const savolIds = pendingUrinish.savolTartibi || [];
      const docs = await Promise.all(savolIds.map((id) => getDoc(doc(db, "savollar", id))));
      const map = {};
      docs.forEach((d) => {
        if (d.exists()) map[d.id] = { id: d.id, ...d.data() };
      });

      setUrinishId(pendingUrinish.id);
      setSavolTartibi(savolIds);
      setVariantTartiblari(pendingUrinish.variantTartiblari || {});
      setSavollarMap(map);
      setJavoblar(pendingUrinish.javoblar || []);
      setTogriSoni(pendingUrinish.togriSoni || 0);
      setPhase("test");
    } catch {
      setPhase("error");
    }
  }

  async function javobTanlash(displeyIndeks) {
    if (tanlangan !== null) return; // bu savolga allaqachon javob berilgan
    setTanlangan(displeyIndeks);
  }

  async function keyingisi() {
    const joriyIndex = javoblar.length;
    const savolId = savolTartibi[joriyIndex];
    const savol = savollarMap[savolId];
    const tartib = variantTartiblari[savolId];
    const aslIndeks = tartib[tanlangan];
    const togrimi = aslIndeks === savol.togriJavobIndex;

    const yangiJavoblar = [...javoblar, aslIndeks];
    const yangiTogriSoni = togrimi ? togriSoni + 1 : togriSoni;
    const oxirgimi = yangiJavoblar.length >= savolTartibi.length;

    try {
      await updateDoc(doc(db, "urinishlar", urinishId), {
        javoblar: yangiJavoblar,
        togriSoni: yangiTogriSoni,
        ...(oxirgimi ? { holati: "tugallangan" } : {}),
      });
    } catch {
      setPhase("error");
      return;
    }

    setJavoblar(yangiJavoblar);
    setTogriSoni(yangiTogriSoni);
    setTanlangan(null);

    if (oxirgimi) setPhase("result");
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
          Sizda &quot;{mavzu?.nomi}&quot; mavzusi bo&apos;yicha tugallanmagan test bor. Davom
          ettirasizmi?
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
    const jami = savolTartibi.length;
    const foiz = jami ? Math.round((togriSoni / jami) * 100) : 0;
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold">Natija</h1>
        <p className="mb-6 text-5xl font-bold text-primary">{foiz}%</p>
        <p className="mb-6 text-gray-600">
          {togriSoni}/{jami} to&apos;g&apos;ri
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
  const joriyIndex = javoblar.length;
  const savolId = savolTartibi[joriyIndex];
  const savol = savollarMap[savolId];
  const tartib = variantTartiblari[savolId] || [0, 1, 2, 3];
  const javobBerilgan = tanlangan !== null;

  return (
    <main className="mx-auto max-w-lg p-6">
      <p className="mb-4 text-sm text-gray-400">
        Savol {joriyIndex + 1} / {savolTartibi.length}
      </p>
      <h1 className="mb-6 text-xl font-semibold">{savol?.matn}</h1>

      <div className="flex flex-col gap-3">
        {tartib.map((aslIndeks, displeyIndeks) => {
          const matn = savol?.variantlar?.[aslIndeks];
          let holatClass = "border-gray-200 bg-white hover:border-secondary";

          if (javobBerilgan) {
            const toGriMi = aslIndeks === savol.togriJavobIndex;
            if (toGriMi) {
              holatClass = "border-primary bg-primary/10 text-primary";
            } else if (displeyIndeks === tanlangan) {
              holatClass = "border-red-400 bg-red-50 text-red-500";
            } else {
              holatClass = "border-gray-200 bg-white opacity-60";
            }
          }

          return (
            <button
              key={aslIndeks}
              type="button"
              disabled={javobBerilgan}
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
