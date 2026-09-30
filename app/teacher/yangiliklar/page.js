"use client";

// app/teacher/yangiliklar/page.js
// Ustoz — Yangiliklar. Ikki bo'lim:
//   1) "Admindan": admin postlari (eng yangisi tepada), har birida yuborish holati
//      ("Yuborilmagan" / "Yuborilgan: 7-A, 8-B" / "Yuborilgan: Hamma sinflarga").
//      "Sinflarimga yuborish" — sinflarni tanlash oynasi; matn NUSXALANMAYDI, ustoz uni
//      o'zgartira olmaydi (admin tahrirlasa/o'chirsa hamma joyda yangilanadi).
//   2) "Mening yangiliklarim": ustoz o'z postini yaratadi (barcha sinflarga yoki bitta
//      sinfga), o'z postlarini tahrirlaydi va o'chiradi.
// "Admindan" sahifa ochilganda BIR marta yuklanadi, "Mening yangiliklarim" — tabga birinchi
// bosilganda (lazy). Polling yo'q; "Yana yuklash" — 20 tadan.

import { useEffect, useState } from "react";
import { useTeacherAuth } from "@/app/teacher/AuthProvider";
import BackLink from "@/components/BackLink";
import Modal from "@/components/Modal";
import { toshkentSanaVaqt } from "@/lib/vaqt";
import { YANGILIK_MAX_UZUNLIK, sinflarMatni, tahrirlanganBelgisi } from "@/lib/yangilikHelpers";

const tugmaAsosiy =
  "rounded-xl2 bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60";
const tugmaOddiy =
  "rounded-xl2 border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60";
const tugmaQizil =
  "rounded-xl2 border border-red-300 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60";

async function apiChaqir(user, url, options = {}) {
  const idToken = await user.getIdToken();
  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${idToken}` },
  });
}

/** Ro'yxat + "Yana yuklash" uchun umumiy holat va yuklash mantig'i. */
function useRoyxat(url, setSinflar) {
  const { user } = useTeacherAuth();
  const [royxat, setRoyxat] = useState(null); // null = yuklanmoqda
  const [kursor, setKursor] = useState(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function yuklash(kursorQiymati) {
    setXato("");
    setYuklanmoqda(true);
    try {
      const res = await apiChaqir(
        user,
        kursorQiymati ? `${url}?kursor=${encodeURIComponent(kursorQiymati)}` : url
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      if (data.sinflar) setSinflar(data.sinflar);
      setRoyxat((oldingi) => {
        const eski = kursorQiymati ? oldingi || [] : [];
        const idlar = new Set(eski.map((x) => x.id));
        return [...eski, ...(data.yangiliklar || []).filter((x) => !idlar.has(x.id))];
      });
      setKursor(data.keyingiKursor || null);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYuklanmoqda(false);
    }
  }

  useEffect(() => {
    yuklash(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { royxat, setRoyxat, kursor, yuklanmoqda, xato, yuklash };
}

function YanaYuklash({ kursor, yuklanmoqda, onClick }) {
  if (!kursor) return null;
  return (
    <div className="mt-6 text-center">
      <button
        type="button"
        disabled={yuklanmoqda}
        onClick={onClick}
        className="rounded-xl2 border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-60"
      >
        {yuklanmoqda ? "Yuklanmoqda..." : "Yana yuklash"}
      </button>
    </div>
  );
}

export default function TeacherYangiliklarPage() {
  const [tab, setTab] = useState("admindan");
  const [menigaOchilgan, setMeningaOchilgan] = useState(false);
  const [sinflar, setSinflar] = useState(null); // null = hali yuklanmagan

  function tabniTanla(nomi) {
    setTab(nomi);
    if (nomi === "mening") setMeningaOchilgan(true);
  }

  const tabClass = (faol) =>
    `rounded-xl2 px-4 py-2 text-sm font-semibold ${
      faol ? "bg-primary text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <BackLink href="/teacher" />
      <h1 className="mb-4 text-2xl font-bold">Yangiliklar</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => tabniTanla("admindan")} className={tabClass(tab === "admindan")}>
          Admindan
        </button>
        <button type="button" onClick={() => tabniTanla("mening")} className={tabClass(tab === "mening")}>
          Mening yangiliklarim
        </button>
      </div>

      <div className={tab === "admindan" ? "" : "hidden"}>
        <AdmindanBolim sinflar={sinflar} setSinflar={setSinflar} />
      </div>
      {menigaOchilgan && (
        <div className={tab === "mening" ? "" : "hidden"}>
          <MeningBolim sinflar={sinflar} setSinflar={setSinflar} />
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------- Admindan

function AdmindanBolim({ sinflar, setSinflar }) {
  const { royxat, setRoyxat, kursor, yuklanmoqda, xato, yuklash } = useRoyxat(
    "/api/teacher/yangiliklar/admindan",
    setSinflar
  );

  return (
    <div>
      {xato && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-500">{xato}</p>
          <button type="button" onClick={() => yuklash(royxat === null ? null : kursor)} className={tugmaOddiy}>
            Qayta urinish
          </button>
        </div>
      )}
      {(royxat === null || sinflar === null) && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}
      {royxat !== null && sinflar !== null && royxat.length === 0 && (
        <p className="text-gray-500">Adminning yangiliklari hozircha yo&apos;q.</p>
      )}

      {sinflar !== null && (
        <div className="flex flex-col gap-4">
          {royxat?.map((y) => (
            <AdminPostKarta
              key={y.id}
              yangilik={y}
              sinflar={sinflar}
              onYuborilgan={(yuborilgan) =>
                setRoyxat((oldingi) => oldingi.map((x) => (x.id === y.id ? { ...x, yuborilgan } : x)))
              }
            />
          ))}
        </div>
      )}

      <YanaYuklash kursor={kursor} yuklanmoqda={yuklanmoqda} onClick={() => yuklash(kursor)} />
    </div>
  );
}

function AdminPostKarta({ yangilik, sinflar, onYuborilgan }) {
  const { user } = useTeacherAuth();
  const [modal, setModal] = useState(false);
  const [bekorTasdiq, setBekorTasdiq] = useState(false);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");

  const belgi = tahrirlanganBelgisi(yangilik.tahrirlangan);
  const sinflarMatn = sinflarMatni(yangilik.yuborilgan?.classIds, sinflar);
  const yuborilgan = sinflarMatn !== "";

  async function yuborishniBekorQilish() {
    setBand(true);
    setXato("");
    try {
      const res = await apiChaqir(user, `/api/teacher/yangiliklar/admindan/${yangilik.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setXato(data.error || "Xatolik yuz berdi");
        setBekorTasdiq(false);
        return;
      }
      setBekorTasdiq(false);
      onYuborilgan(null);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
      setBekorTasdiq(false);
    } finally {
      setBand(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-gray-200 bg-white p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-primary px-2.5 py-0.5 font-bold text-white">Admin</span>
        <span
          className={`rounded-full px-2.5 py-0.5 font-semibold ${
            yuborilgan ? "bg-primary/15 text-primary-dark" : "bg-gray-100 text-gray-500"
          }`}
        >
          {yuborilgan ? `Yuborilgan: ${sinflarMatn}` : "Yuborilmagan"}
        </span>
        <span className="ml-auto text-gray-400">
          {yangilik.yaratilgan ? toshkentSanaVaqt(yangilik.yaratilgan) : ""}
          {belgi && <span className="ml-2 italic">· {belgi}</span>}
        </span>
      </div>

      <p className="whitespace-pre-wrap break-words text-gray-800">{yangilik.matn}</p>
      {xato && <p className="mt-2 text-sm text-red-500">{xato}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setModal(true)} className={tugmaAsosiy}>
          {yuborilgan ? "Yuborishni o'zgartirish" : "Sinflarimga yuborish"}
        </button>
        {yuborilgan && (
          <button type="button" onClick={() => setBekorTasdiq(true)} className={tugmaOddiy}>
            Yuborishni bekor qilish
          </button>
        )}
      </div>

      {modal && (
        <YuborishModal
          yangilikId={yangilik.id}
          sinflar={sinflar}
          boshlangich={yangilik.yuborilgan?.classIds || []}
          onClose={() => setModal(false)}
          onSaqlandi={(yuborilganYangi) => {
            setModal(false);
            onYuborilgan(yuborilganYangi);
          }}
        />
      )}

      {bekorTasdiq && (
        <Modal title="Yuborishni bekor qilamizmi?" onClose={() => setBekorTasdiq(false)}>
          <p className="mb-4 text-sm text-gray-600">
            O&apos;quvchilaringiz bu yangilikni endi ko&apos;rmaydi. Keyin yana yuborishingiz mumkin.
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setBekorTasdiq(false)} className={`flex-1 ${tugmaOddiy}`}>
              Yo&apos;q
            </button>
            <button
              type="button"
              disabled={band}
              onClick={yuborishniBekorQilish}
              className="flex-1 rounded-xl2 bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {band ? "..." : "Ha, bekor qilish"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * Sinflarni tanlash oynasi: "Barcha sinflarim" yoki alohida sinflar (bir nechtasini ham
 * belgilash mumkin). Oldin yuborilgan sinflar belgilangan holda ochiladi; "Yuborish"
 * ro'yxatni tanlanganiga ALMASHTIRADI (ustiga yozadi).
 */
function YuborishModal({ yangilikId, sinflar, boshlangich, onClose, onSaqlandi }) {
  const { user } = useTeacherAuth();
  const [tanlangan, setTanlangan] = useState(
    () => new Set(sinflar.filter((s) => boshlangich.includes(s.id)).map((s) => s.id))
  );
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");

  const hammasi = sinflar.length > 0 && tanlangan.size === sinflar.length;

  function hammasiniAlmashtir() {
    setTanlangan(hammasi ? new Set() : new Set(sinflar.map((s) => s.id)));
  }
  function birniAlmashtir(id) {
    setTanlangan((oldingi) => {
      const yangi = new Set(oldingi);
      if (yangi.has(id)) yangi.delete(id);
      else yangi.add(id);
      return yangi;
    });
  }

  async function yuborish() {
    setXato("");
    if (tanlangan.size === 0) {
      setXato("Kamida bitta sinfni tanlang");
      return;
    }
    setBand(true);
    try {
      const res = await apiChaqir(user, `/api/teacher/yangiliklar/admindan/${yangilikId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // "Barcha sinflarim" — serverning o'zi hozirgi sinflarni aniqlaydi.
        body: JSON.stringify(hammasi ? { hammasi: true } : { classIds: [...tanlangan] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      onSaqlandi(data.yuborilgan);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setBand(false);
    }
  }

  return (
    <Modal title="Sinflarga yuborish" onClose={onClose}>
      {sinflar.length === 0 ? (
        <p className="mb-4 text-sm text-gray-600">Avval sinf yarating.</p>
      ) : (
        <div className="mb-4 flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={hammasi}
              onChange={hammasiniAlmashtir}
              className="h-4 w-4 accent-primary"
            />
            Barcha sinflarim
          </label>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto border-t border-gray-100 pt-2">
            {sinflar.map((s) => (
              <label key={s.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tanlangan.has(s.id)}
                  onChange={() => birniAlmashtir(s.id)}
                  className="h-4 w-4 accent-primary"
                />
                {s.nomi}
              </label>
            ))}
          </div>
        </div>
      )}
      {xato && <p className="mb-3 text-sm text-red-500">{xato}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className={`flex-1 ${tugmaOddiy}`}>
          Bekor qilish
        </button>
        <button
          type="button"
          disabled={band || sinflar.length === 0}
          onClick={yuborish}
          className={`flex-1 ${tugmaAsosiy}`}
        >
          {band ? "Yuborilmoqda..." : "Yuborish"}
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------ Mening yangiliklarim

function MeningBolim({ sinflar, setSinflar }) {
  const { user } = useTeacherAuth();
  const { royxat, setRoyxat, kursor, yuklanmoqda, xato, yuklash } = useRoyxat(
    "/api/teacher/yangiliklar",
    setSinflar
  );

  const [matn, setMatn] = useState("");
  const [sinf, setSinf] = useState("hammasi");
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [formaXato, setFormaXato] = useState("");

  const sinfYoq = sinflar !== null && sinflar.length === 0;

  async function elonQilish(e) {
    e.preventDefault();
    setFormaXato("");
    if (!matn.trim()) {
      setFormaXato("Yangilik matnini yozing");
      return;
    }
    setYuborilmoqda(true);
    try {
      const res = await apiChaqir(user, "/api/teacher/yangiliklar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matn, sinf }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormaXato(data.error || "Xatolik yuz berdi");
        return;
      }
      setRoyxat((oldingi) => [data.yangilik, ...(oldingi || [])]);
      setMatn("");
    } catch {
      setFormaXato("Server bilan bog'lanishda xatolik");
    } finally {
      setYuborilmoqda(false);
    }
  }

  return (
    <div>
      <form onSubmit={elonQilish} className="mb-8 rounded-xl2 border border-gray-200 bg-white p-5">
        <textarea
          value={matn}
          onChange={(e) => setMatn(e.target.value)}
          maxLength={YANGILIK_MAX_UZUNLIK}
          rows={5}
          placeholder="Yangilik matni..."
          className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {matn.length} / {YANGILIK_MAX_UZUNLIK}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-gray-600">Kimlarga:</span>
          <select
            value={sinf}
            onChange={(e) => setSinf(e.target.value)}
            className="rounded-xl2 border border-gray-300 px-3 py-2"
          >
            <option value="hammasi">Barcha sinflarim</option>
            {(sinflar || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nomi}
              </option>
            ))}
          </select>
        </div>

        {sinfYoq && <p className="mt-3 text-sm text-gray-500">Yangilik yozish uchun avval sinf yarating.</p>}
        {formaXato && <p className="mt-3 text-sm text-red-500">{formaXato}</p>}
        <button
          type="submit"
          disabled={yuborilmoqda || sinfYoq || sinflar === null}
          className={`mt-4 ${tugmaAsosiy} px-5 py-2.5 text-base`}
        >
          {yuborilmoqda ? "Yuborilmoqda..." : "E'lon qilish"}
        </button>
      </form>

      {xato && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-500">{xato}</p>
          <button type="button" onClick={() => yuklash(royxat === null ? null : kursor)} className={tugmaOddiy}>
            Qayta urinish
          </button>
        </div>
      )}
      {royxat === null && !xato && <p className="text-gray-400">Yuklanmoqda...</p>}
      {royxat !== null && royxat.length === 0 && (
        <p className="text-gray-500">Siz hali yangilik yozmagansiz.</p>
      )}

      <div className="flex flex-col gap-4">
        {royxat?.map((y) => (
          <OzPostKarta
            key={y.id}
            yangilik={y}
            sinflar={sinflar || []}
            onYangilandi={(yangi) => setRoyxat((oldingi) => oldingi.map((x) => (x.id === yangi.id ? yangi : x)))}
            onOchirildi={(id) => setRoyxat((oldingi) => oldingi.filter((x) => x.id !== id))}
          />
        ))}
      </div>

      <YanaYuklash kursor={kursor} yuklanmoqda={yuklanmoqda} onClick={() => yuklash(kursor)} />
    </div>
  );
}

function OzPostKarta({ yangilik, sinflar, onYangilandi, onOchirildi }) {
  const { user } = useTeacherAuth();
  const [tahrirlash, setTahrirlash] = useState(false);
  const [matn, setMatn] = useState(yangilik.matn);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [ochirishTasdiq, setOchirishTasdiq] = useState(false);
  const [ochirilmoqda, setOchirilmoqda] = useState(false);

  const belgi = tahrirlanganBelgisi(yangilik.tahrirlangan);
  const sinflarMatn = sinflarMatni(yangilik.classIds, sinflar) || "Sinflar o'chirilgan";

  function tahrirniBoshlash() {
    setMatn(yangilik.matn);
    setXato("");
    setTahrirlash(true);
  }

  async function saqlash() {
    setXato("");
    if (!matn.trim()) {
      setXato("Yangilik matnini yozing");
      return;
    }
    setSaqlanmoqda(true);
    try {
      const res = await apiChaqir(user, `/api/teacher/yangiliklar/${yangilik.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setXato(data.error || "Xatolik yuz berdi");
        return;
      }
      onYangilandi(data.yangilik);
      setTahrirlash(false);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
    } finally {
      setSaqlanmoqda(false);
    }
  }

  async function ochirish() {
    setOchirilmoqda(true);
    setXato("");
    try {
      const res = await apiChaqir(user, `/api/teacher/yangiliklar/${yangilik.id}`, { method: "DELETE" });
      // 404 — allaqachon o'chirilgan: ro'yxatdan olib tashlaymiz.
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        setXato(data.error || "Xatolik yuz berdi");
        setOchirishTasdiq(false);
        return;
      }
      onOchirildi(yangilik.id);
    } catch {
      setXato("Server bilan bog'lanishda xatolik");
      setOchirishTasdiq(false);
    } finally {
      setOchirilmoqda(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-gray-200 bg-white p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 font-semibold text-secondary">
          {sinflarMatn}
        </span>
        <span className="ml-auto text-gray-400">
          {yangilik.yaratilgan ? toshkentSanaVaqt(yangilik.yaratilgan) : ""}
          {belgi && <span className="ml-2 italic">· {belgi}</span>}
        </span>
      </div>

      {tahrirlash ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={matn}
            onChange={(e) => setMatn(e.target.value)}
            maxLength={YANGILIK_MAX_UZUNLIK}
            rows={5}
            className="w-full rounded-xl2 border border-gray-300 px-3 py-2"
          />
          <p className="text-right text-xs text-gray-400">
            {matn.length} / {YANGILIK_MAX_UZUNLIK}
          </p>
          {xato && <p className="text-sm text-red-500">{xato}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saqlanmoqda} onClick={saqlash} className={tugmaAsosiy}>
              {saqlanmoqda ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button type="button" onClick={() => setTahrirlash(false)} className={tugmaOddiy}>
              Bekor qilish
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap break-words text-gray-800">{yangilik.matn}</p>
          {xato && <p className="mt-2 text-sm text-red-500">{xato}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={tahrirniBoshlash} className={tugmaOddiy}>
              Tahrirlash
            </button>
            <button type="button" onClick={() => setOchirishTasdiq(true)} className={tugmaQizil}>
              O&apos;chirish
            </button>
          </div>
        </>
      )}

      {ochirishTasdiq && (
        <Modal title="Ishonchingiz komilmi?" onClose={() => setOchirishTasdiq(false)}>
          <p className="mb-4 text-sm text-gray-600">
            Yangilik o&apos;quvchilaringizdan ham o&apos;chadi. Buni qaytarib bo&apos;lmaydi.
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setOchirishTasdiq(false)} className={`flex-1 ${tugmaOddiy}`}>
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={ochirilmoqda}
              onClick={ochirish}
              className="flex-1 rounded-xl2 bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {ochirilmoqda ? "..." : "Ha, o'chirish"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
