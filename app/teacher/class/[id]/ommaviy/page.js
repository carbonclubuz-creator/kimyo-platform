"use client";

// app/teacher/class/[id]/ommaviy/page.js
// "Ko'plab qo'shish" (4-bosqich): 1) matn maydoniga "Ism Familiya" qatorlari
// kiritiladi (Excel'dan tab bilan ham bo'ladi), 2) preview jadvalida har qator
// mavjud validatsiya bilan tekshiriladi va joyida tuzatiladi, 3) yaratish —
// 10 tadan bo'laklab ketma-ket (progress bilan), natija jadvali va PDF.
//
// Natija jadvalida "Hammasini nusxalash" ATAYLAB YO'Q (guruhga tasodifan
// tashlanib ketish xavfi): nusxalash/ulashish faqat qator bo'yicha.
// Yaratilmagan qatorlar "Qayta urinish" bilan qayta yuboriladi —
// muvaffaqiyatli yaratilganlar qayta yuborilmaydi (dublikat bo'lmasin).

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import BackLink from "@/components/BackLink";
import Modal from "@/components/Modal";
import { CopyIcon } from "@/components/icons";
import {
  JAMI_QATOR_MAX,
  SOROV_BO_LAGI,
  bolaklarga,
  matnniQatorlarga,
  qatorniTekshir,
  takroriyIndekslar,
  ulashishMatni,
} from "@/lib/ommaviyHelpers";
import { varaqchalarPdf } from "@/lib/pdfVaraqchalar";

export default function OmmaviyQoshishSahifasi({ params }) {
  const { id: classId } = params;
  const { user } = useTeacherAuth();

  const [sinfNomi, setSinfNomi] = useState("");
  const [bosqich, setBosqich] = useState("kiritish"); // kiritish | tekshirish | yaratish | natija
  const [matn, setMatn] = useState("");
  // Har qator: { key, ism, familiya, natija?: { ok, login, password, uid } | { ok:false, error } }
  const [qatorlar, setQatorlar] = useState([]);
  const [umumiyXato, setUmumiyXato] = useState("");
  const [yordamOchiq, setYordamOchiq] = useState(false);
  const [progress, setProgress] = useState({ bajarildi: 0, jami: 0 });

  useEffect(() => {
    let faol = true;
    getDoc(doc(db, "classes", classId)).then((snap) => {
      if (faol && snap.exists() && snap.data().teacherId === user.uid) setSinfNomi(snap.data().nomi);
    });
    return () => {
      faol = false;
    };
  }, [classId, user.uid]);

  const matnQatorlarSoni = matn.split(/\r\n|\r|\n/).length;
  const textareaQatorlari = Math.min(10, Math.max(5, matnQatorlarSoni));

  function tekshirishgaOtish() {
    setUmumiyXato("");
    const royxat = matnniQatorlarga(matn);
    if (royxat.length === 0) {
      setUmumiyXato("Kamida bitta o'quvchi kiriting.");
      return;
    }
    if (royxat.length > JAMI_QATOR_MAX) {
      setUmumiyXato(
        `Bir martada ko'pi bilan ${JAMI_QATOR_MAX} ta o'quvchi qo'shish mumkin (siz ${royxat.length} ta kiritdingiz). Ro'yxatni qismlarga bo'ling.`
      );
      return;
    }
    setQatorlar(royxat.map((q, i) => ({ key: i, ...q })));
    setBosqich("tekshirish");
  }

  function qatorniOzgartir(key, maydon, qiymat) {
    setQatorlar((eski) => eski.map((q) => (q.key === key ? { ...q, [maydon]: qiymat } : q)));
  }
  function qatorniOlibTashla(key) {
    setQatorlar((eski) => eski.filter((q) => q.key !== key));
  }

  const tekshiruv = useMemo(() => qatorlar.map((q) => qatorniTekshir(q)), [qatorlar]);
  const takror = useMemo(() => takroriyIndekslar(qatorlar), [qatorlar]);
  const xatoliSoni = tekshiruv.filter((t) => !t.ok).length;

  // Yaratilmagan (natijasiz yoki xatoli) qatorlarni 10 tadan bo'laklab yuboradi.
  async function yaratish() {
    setUmumiyXato("");
    const navbat = qatorlar.filter((q) => !q.natija?.ok);
    if (navbat.length === 0) return;
    setBosqich("yaratish");
    setProgress({ bajarildi: 0, jami: navbat.length });

    let bajarildi = 0;
    for (const bolak of bolaklarga(navbat, SOROV_BO_LAGI)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const idToken = await user.getIdToken();
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch("/api/teacher/students/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            classId,
            students: bolak.map((q) => ({ ism: q.ism, familiya: q.familiya })),
          }),
        });
        // eslint-disable-next-line no-await-in-loop
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.natijalar)) {
          throw new Error(data.error || "Server xatosi");
        }
        setQatorlar((eski) =>
          eski.map((q) => {
            const j = bolak.findIndex((b) => b.key === q.key);
            return j === -1 ? q : { ...q, natija: data.natijalar[j] };
          })
        );
        bajarildi += bolak.length;
        setProgress({ bajarildi, jami: navbat.length });
      } catch (err) {
        // Uzilish: shu bo'lak va qolganlari yaratilmagan deb belgilanadi — "Qayta urinish"
        // faqat shularni yuboradi.
        setUmumiyXato(
          `Aloqa uzildi yoki server xatosi: ${err.message}. Yaratilganlar saqlandi — "Qayta urinish" faqat yaratilmaganlarni yuboradi.`
        );
        break;
      }
    }
    setBosqich("natija");
  }

  const yaratilgan = qatorlar.filter((q) => q.natija?.ok);
  const yaratilmagan = qatorlar.filter((q) => !q.natija?.ok);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <BackLink href={`/teacher/class/${classId}`}>Sinfga qaytish</BackLink>
      <h1 className="mb-1 text-2xl font-bold">Ko&apos;plab qo&apos;shish</h1>
      {sinfNomi && <p className="mb-6 text-sm text-gray-500">Sinf: {sinfNomi}</p>}

      {bosqich === "kiritish" && (
        <section>
          <label htmlFor="royxat" className="mb-2 block text-sm font-medium text-gray-700">
            Har qatorga bitta &quot;Ism Familiya&quot;
          </label>
          <textarea
            id="royxat"
            rows={textareaQatorlari}
            value={matn}
            onChange={(e) => setMatn(e.target.value)}
            placeholder={"Ali Valiyev\nVali Aliyev\nOʻtkir Karimov"}
            className="w-full resize-none overflow-y-auto rounded-xl2 border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:border-secondary"
          />
          <button
            type="button"
            onClick={() => setYordamOchiq(true)}
            className="mt-2 text-sm text-secondary underline"
          >
            Ism familiya qanday kiritiladi?
          </button>
          {umumiyXato && <p className="mt-3 text-sm text-red-500">{umumiyXato}</p>}
          <button
            type="button"
            onClick={tekshirishgaOtish}
            className="mt-4 w-full rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark"
          >
            Tekshirish
          </button>
        </section>
      )}

      {bosqich === "tekshirish" && (
        <section>
          <p className="mb-3 text-sm text-gray-600">
            {qatorlar.length} ta qator. Xato qatorlarni shu yerning o&apos;zida tuzating yoki × bilan
            olib tashlang.
          </p>
          <div className="overflow-x-auto rounded-xl2 border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">Ism</th>
                  <th className="px-3 py-3 font-medium">Familiya</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {qatorlar.map((q, i) => {
                  const t = tekshiruv[i];
                  const dublikat = takror.has(i);
                  return (
                    <tr
                      key={q.key}
                      className={`border-t border-gray-100 align-top ${
                        !t.ok ? "bg-red-50" : dublikat ? "bg-yellow-50" : "bg-green-50/40"
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={q.ism}
                          onChange={(e) => qatorniOzgartir(q.key, "ism", e.target.value)}
                          aria-label={`${i + 1}-qator ismi`}
                          className={`w-full min-w-[7rem] rounded-lg border px-2 py-1.5 ${
                            t.ismXato ? "border-red-400" : "border-gray-300"
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={q.familiya}
                          onChange={(e) => qatorniOzgartir(q.key, "familiya", e.target.value)}
                          aria-label={`${i + 1}-qator familiyasi`}
                          className={`w-full min-w-[7rem] rounded-lg border px-2 py-1.5 ${
                            t.familiyaXato ? "border-red-400" : "border-gray-300"
                          }`}
                        />
                        {!t.ok && (
                          <p className="mt-1 text-xs text-red-500">
                            {t.ismXato ? `Ism: ${t.ismXato}` : `Familiya: ${t.familiyaXato}`}
                          </p>
                        )}
                        {t.ok && dublikat && (
                          <p className="mt-1 text-xs text-yellow-700">
                            Takroriy ism-familiya — login oxiriga raqam qo&apos;shiladi.
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => qatorniOlibTashla(q.key)}
                          className="text-xl leading-none text-gray-400 hover:text-red-500"
                          aria-label={`${i + 1}-qatorni olib tashlash`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {qatorlar.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">Barcha qatorlar olib tashlandi.</p>
          )}
          {xatoliSoni > 0 && (
            <p className="mt-3 text-sm text-red-500">
              {xatoliSoni} ta qatorda xato bor — tuzatilmaguncha &quot;Yaratish&quot; faol emas.
            </p>
          )}
          {umumiyXato && <p className="mt-3 text-sm text-red-500">{umumiyXato}</p>}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setBosqich("kiritish")}
              className="flex-1 rounded-xl2 border border-gray-300 px-4 py-3 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Orqaga
            </button>
            <button
              type="button"
              onClick={yaratish}
              disabled={xatoliSoni > 0 || qatorlar.length === 0}
              className="flex-1 rounded-xl2 bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Yaratish ({qatorlar.length})
            </button>
          </div>
        </section>
      )}

      {bosqich === "yaratish" && (
        <section className="rounded-xl2 border border-gray-200 bg-white p-6 text-center">
          <p className="mb-3 font-semibold">
            {progress.bajarildi}/{progress.jami} yaratildi
          </p>
          <div
            className="h-3 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.jami}
            aria-valuenow={progress.bajarildi}
          >
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress.jami ? (progress.bajarildi / progress.jami) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-gray-400">Sahifani yopmang...</p>
        </section>
      )}

      {bosqich === "natija" && (
        <section>
          {umumiyXato && <p className="mb-3 text-sm text-red-500">{umumiyXato}</p>}
          <p className="mb-3 text-sm text-gray-600">
            {yaratilgan.length} ta o&apos;quvchi yaratildi
            {yaratilmagan.length > 0 && `, ${yaratilmagan.length} tasi yaratilmadi`}. Login va parolni
            har bir o&apos;quvchiga alohida bering.
          </p>

          <div className="overflow-x-auto rounded-xl2 border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Ism-Familiya</th>
                  <th className="px-4 py-3 font-medium">Login</th>
                  <th className="px-4 py-3 font-medium">Parol</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {qatorlar.map((q) => (
                  <NatijaQatori key={q.key} q={q} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {yaratilmagan.length > 0 && (
              <button
                type="button"
                onClick={yaratish}
                className="rounded-xl2 bg-red-500 px-4 py-3 font-semibold text-white hover:bg-red-600"
              >
                Qayta urinish ({yaratilmagan.length})
              </button>
            )}
            <PdfTugmasi yaratilgan={yaratilgan} sinfNomi={sinfNomi} />
            <BackLink href={`/teacher/class/${classId}`} className="!mb-0 px-4 py-3 text-base">
              Sinfga qaytish
            </BackLink>
          </div>
        </section>
      )}

      {yordamOchiq && (
        <Modal title="Qanday kiritiladi?" onClose={() => setYordamOchiq(false)}>
          <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
            <li>Har qatorda bitta o&apos;quvchi.</li>
            <li>Ism va familiya — bittadan so&apos;z.</li>
            <li>Har biri kamida 3 harf.</li>
            <li>Faqat lotin harflari va o&apos; g&apos; belgilari.</li>
            <li>Raqam, chiziqcha, nuqta bo&apos;lmasin.</li>
            <li>Excel&apos;dan (Ism va Familiya ustunlarini) to&apos;g&apos;ridan-to&apos;g&apos;ri nusxalab qo&apos;yish mumkin.</li>
          </ul>
          <p className="mb-1 text-xs text-gray-500">Namuna:</p>
          <pre className="rounded-lg bg-gray-50 p-3 font-mono text-sm text-gray-700">
            {"Ali Valiyev\nGulnora Karimova\nOʻtkir Rahimov"}
          </pre>
        </Modal>
      )}
    </main>
  );
}

/** Natija jadvalidagi bitta qator; nusxalash/ulashish faqat shu qator uchun. */
function NatijaQatori({ q }) {
  const [holat, setHolat] = useState("");
  const n = q.natija;

  if (!n?.ok) {
    return (
      <tr className="border-t border-gray-100 bg-red-50">
        <td className="px-4 py-3">
          {q.ism} {q.familiya}
        </td>
        <td className="px-4 py-3 text-sm text-red-500" colSpan={3}>
          {n?.error ? `Yaratilmadi: ${n.error}` : "Yaratilmadi (aloqa uzilgan)"}
        </td>
      </tr>
    );
  }

  const matn = ulashishMatni({ ism: n.ism || q.ism, familiya: n.familiya || q.familiya, login: n.login, parol: n.password });

  async function nusxala() {
    try {
      await navigator.clipboard.writeText(matn);
      setHolat("Nusxalandi!");
    } catch {
      setHolat("Nusxalab bo'lmadi");
    }
    setTimeout(() => setHolat(""), 1500);
  }

  async function ulash() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: matn });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // foydalanuvchi bekor qildi
      }
    }
    await nusxala();
  }

  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-3">
        {q.ism} {q.familiya}
      </td>
      <td className="px-4 py-3 font-mono">{n.login}</td>
      <td className="px-4 py-3 font-mono">{n.password}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={nusxala}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <CopyIcon /> {holat || "Nusxalash"}
          </button>
          <button
            type="button"
            onClick={ulash}
            className="rounded-lg border border-secondary px-2.5 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/10"
          >
            Ulashish
          </button>
        </div>
      </td>
    </tr>
  );
}

function PdfTugmasi({ yaratilgan, sinfNomi }) {
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");

  async function chop() {
    setXato("");
    setBand(true);
    try {
      await varaqchalarPdf({
        sinfNomi: sinfNomi || "sinf",
        royxat: yaratilgan.map((q) => ({
          ism: q.natija.ism || q.ism,
          familiya: q.natija.familiya || q.familiya,
          login: q.natija.login,
          parol: q.natija.password,
        })),
      });
    } catch (err) {
      setXato(err.message || "PDF yaratib bo'lmadi");
    } finally {
      setBand(false);
    }
  }

  if (yaratilgan.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={chop}
        disabled={band}
        className="rounded-xl2 bg-secondary px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {band ? "Tayyorlanmoqda..." : "Chop etish (PDF)"}
      </button>
      {xato && <p className="mt-2 max-w-md text-sm text-red-500">{xato}</p>}
    </div>
  );
}
