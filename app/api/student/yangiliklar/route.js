// app/api/student/yangiliklar/route.js
// GET ?kursor=... — o'quvchi yangiliklar lentasi (faqat o'qish), eng yangisi birinchi, 20 tadan.
//
// Kim nimani ko'radi (sinf ID'si FAQAT o'quvchining o'z `users` hujjatidan olinadi):
//   - sinfdagi o'quvchi: (a) ustozining shu sinfga yo'naltirilgan O'Z postlari
//     (yangiliklar.classIds ∋ sinf) va (b) ustoz shu sinfga yuborgan ADMIN postlari
//     (yangilikYuborishlar.classIds ∋ sinf → asl post `yangiliklar` dan o'qiladi);
//   - mustaqil (sinfsiz) o'quvchi: admin postlari (mustaqilga: true).
//
// Sahifalash: ikki manba lib/yangilikFeed.js dagi YAGONA tartib (vaqt kamayish, teng vaqtda
// tur va ID) bo'yicha birlashtiriladi; kursor = oxirgi ko'rsatilgan yozuvning o'rni, har
// manbadan shu o'rindan keyingisi so'raladi — takrorlanish ham, tushib qolish ham yo'q.
// (a) manbaning vaqti = post yaratilgan payti; (b) manbaniki = ustozning yuborgan payti
// (qayta yuborilsa yangilanadi). Lentada ko'rsatiladigan sana ham shu vaqt.
//
// Kerakli composite indekslar:
//   yangiliklar          — classIds (Arrays) + yaratilgan (Kamayish)
//   yangiliklar          — mustaqilga (O'sish) + yaratilgan (Kamayish)
//   yangilikYuborishlar  — classIds (Arrays) + yuborilgan (Kamayish)
// Har sahifa: har manbadan ko'pi bilan 21 ta hujjat + (b) uchun ko'pi bilan 20 ta asl post
// + muallif ustozlar (odatda 1 ta) — polling yo'q, faqat "Yangiliklar" tabi birinchi ochilganda
// va "Yana yuklash" bosilganda.

import { NextResponse } from "next/server";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { requireStudent } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { YANGILIK_SAHIFA_HAJMI } from "@/lib/yangilikHelpers";
import {
  birlashtirSahifa,
  kursorOqish,
  kursorYasash,
  manbaKursori,
  yozuvMillis,
} from "@/lib/yangilikFeed";
import { millis } from "@/lib/yangilikServer";

export const runtime = "nodejs";

/** Bitta manbadan (limit + 1 ta) yozuvlarni oladi; kursor bo'lsa undan keyingisidan. */
async function manbaOl(asosiySorov, vaqtMaydoni, tur, kursor) {
  let q = asosiySorov.orderBy(vaqtMaydoni, "desc").orderBy(FieldPath.documentId(), "desc");
  const k = manbaKursori(tur, kursor);
  if (k) {
    const ts = new Timestamp(k.s, k.n);
    if (k.rejim === "dan") q = q.startAt(ts);
    else if (k.id) q = q.startAfter(ts, k.id);
    else q = q.startAfter(ts);
  }
  const snap = await q.limit(YANGILIK_SAHIFA_HAJMI + 1).get();
  return snap.docs
    .map((d) => {
      const t = d.get(vaqtMaydoni);
      return t && typeof t.seconds === "number"
        ? { s: t.seconds, n: t.nanoseconds, tur, id: d.id, doc: d }
        : null;
    })
    .filter(Boolean);
}

export async function GET(request) {
  const authResult = await requireStudent(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { studentData } = authResult;

  const kursorParam = new URL(request.url).searchParams.get("kursor");
  let kursor = null;
  if (kursorParam) {
    kursor = kursorOqish(kursorParam);
    if (!kursor) return NextResponse.json({ error: "Kursor noto'g'ri" }, { status: 400 });
  }

  const yangiliklar = adminDb.collection("yangiliklar");
  const classId = typeof studentData.classId === "string" && studentData.classId ? studentData.classId : null;

  let manbalar;
  if (classId) {
    manbalar = await Promise.all([
      manbaOl(yangiliklar.where("classIds", "array-contains", classId), "yaratilgan", "a", kursor),
      manbaOl(
        adminDb.collection("yangilikYuborishlar").where("classIds", "array-contains", classId),
        "yuborilgan",
        "b",
        kursor
      ),
    ]);
  } else {
    // Mustaqil o'quvchi: admin postlari (vaqti — yaratilgan). Yagona manba, tur "a".
    manbalar = [await manbaOl(yangiliklar.where("mustaqilga", "==", true), "yaratilgan", "a", kursor)];
  }

  const { sahifa, yana } = birlashtirSahifa(manbalar, YANGILIK_SAHIFA_HAJMI);

  // (b) yozuvlar uchun asl admin postlari; o'chirilgan post — "o'lik" yozuv, o'tkazib yuboriladi
  // (kursor baribir oldinga siljiydi).
  const bYozuvlar = sahifa.filter((y) => y.tur === "b" && classId);
  const asllar = bYozuvlar.length
    ? await adminDb.getAll(
        ...bYozuvlar.map((y) => yangiliklar.doc(String(y.doc.get("yangilikId") || "yoq")))
      )
    : [];
  const asilMap = new Map(bYozuvlar.map((y, i) => [y.id, asllar[i]]));

  // (a) yozuvlar muallifi (ustoz) ismi.
  const ustozIds = [
    ...new Set(
      sahifa
        .filter((y) => y.tur === "a" && y.doc.get("muallifRoli") === "teacher")
        .map((y) => y.doc.get("muallifId"))
        .filter((x) => typeof x === "string" && x)
    ),
  ];
  const ustozSnaplar = ustozIds.length
    ? await adminDb.getAll(...ustozIds.map((id) => adminDb.collection("users").doc(id)))
    : [];
  const ustozNomi = new Map(
    ustozSnaplar.map((s) => [
      s.id,
      s.exists ? `${s.data().ism || ""} ${s.data().familiya || ""}`.trim() || "Ustoz" : "Ustoz",
    ])
  );

  const items = [];
  for (const y of sahifa) {
    let d;
    let id;
    let tur;
    let muallif;
    if (y.tur === "b" && classId) {
      const asl = asilMap.get(y.id);
      if (!asl || !asl.exists || asl.data().muallifRoli !== "admin") continue;
      d = asl.data();
      id = asl.id;
      tur = "admin";
      muallif = "Admin";
    } else {
      d = y.doc.data();
      id = y.doc.id;
      if (d.muallifRoli === "admin") {
        tur = "admin";
        muallif = "Admin";
      } else {
        tur = "ustoz";
        muallif = ustozNomi.get(d.muallifId) || "Ustoz";
      }
    }
    items.push({
      id,
      tur,
      muallif,
      matn: d.matn || "",
      sana: yozuvMillis(y),
      tahrirlangan: millis(d.tahrirlangan),
    });
  }

  return NextResponse.json({
    yangiliklar: items,
    keyingiKursor: yana && sahifa.length ? kursorYasash(sahifa[sahifa.length - 1]) : null,
  });
}
