# BirKuch (MVP)

Duolingo uslubidagi ta'lim platformasi. Next.js (App Router) + Firebase + Tailwind CSS, Netlify'da joylashtiriladi.

## Papka tuzilmasi

```
kimyo-platform/
├── app/
│   ├── layout.js                    # root layout
│   ├── page.js                      # bosh sahifa (Kirish / Ro'yxatdan o'tish)
│   ├── globals.css
│   ├── login/
│   │   └── page.js                  # umumiy kirish sahifasi (student va teacher)
│   ├── register/
│   │   ├── student/page.js          # mustaqil o'quvchi ro'yxatdan o'tishi
│   │   └── teacher/page.js          # ustoz ro'yxatdan o'tishi
│   ├── api/
│   │   ├── teacher/
│   │   │   ├── students/route.js         # POST — o'quvchi qo'shish (Admin SDK)
│   │   │   ├── students/bulk/route.js    # POST — ommaviy qo'shish (≤10 qator/so'rov, qator bo'yicha natija)
│   │   │   ├── reset-password/route.js   # POST — o'quvchi parolini yangilash (Admin SDK)
│   │   │   ├── stats/route.js            # GET — sinf statistikasi (davr/mavzu tablari)
│   │   │   └── stats/student/route.js    # GET — bitta o'quvchining urinishlar tarixi (faqat ustoz)
│   │   └── admin/bonus/route.js          # GET/POST — bonus jon (sozlamalar/bonusJon)
│   ├── teacher/
│   │   ├── layout.js                # auth guard (role === "teacher") + yuqori panel
│   │   ├── AuthProvider.js          # auth Context (user, userData, logout)
│   │   ├── TeacherHeader.js         # yuqori panel (ism, chiqish)
│   │   ├── page.js                  # ustoz paneli: sinflar ro'yxati + sinf yaratish
│   │   ├── class/[id]/page.js       # sinf ichi: O'quvchilar | Statistika bo'limlari, Ko'plab qo'shish, Chop etish
│   │   ├── class/[id]/ClassStats.js # 5 tabli statistika (Haftalik/Bugungi/Kechagi/Umumiy/Mavzular)
│   │   ├── class/[id]/ChopEtish.js  # "Chop etish (PDF)" tugmasi (hashteg o'quvchilari o'tkaziladi)
│   │   ├── class/[id]/ommaviy/page.js            # Ko'plab qo'shish: kiritish → preview → yaratish → natija
│   │   ├── class/[id]/student/[studentId]/page.js # individual o'quvchi: akkount + urinishlar tarixi
│   │   ├── classes/page.js          # TODO — keyingi promtda aniqlashtiriladi/olib tashlanadi
│   │   └── students/page.js         # TODO — keyingi promtda aniqlashtiriladi/olib tashlanadi
│   ├── student/
│   │   ├── layout.js                # student shell (auth guard + StudentHeader)
│   │   ├── AuthProvider.js          # auth Context (user, userData, qolganJon, logout)
│   │   ├── StudentHeader.js         # yuqori panel (jonlar ko'rsatkichi, ism, chiqish)
│   │   ├── page.js                  # mavzular ro'yxati + eng yuqori foizlar
│   │   └── test/[mavzuId]/page.js   # test ishlash sahifasi (boshlash/davom ettirish, jonlar)
│   └── admin/
│       ├── page.js                  # admin — qo'lda parol tiklash
│       ├── questions/page.js        # savollar bazasini boshqarish
│       └── bonus/page.js            # bonus jon yoqish/o'chirish (tasdiqlash oynasi bilan)
├── components/
│   ├── CredentialsCard.js           # generatsiya qilingan login/parolni ko'rsatish (nusxalash tugmasi)
│   ├── Modal.js                     # umumiy overlay modal
│   ├── OquvchiAkkount.js            # login/parol/yangi parol (sinf jadvali va individual sahifa uchun umumiy)
│   ├── Toast.js                     # to'smaydigan toast (test ichidagi motivatsion matnlar)
│   ├── TestProgress.js              # test progress bari (🧪 bilan)
│   └── icons.js                     # kichik SVG ikonkalar (ko'z, nusxalash)
├── public/fonts/                    # NotoSans-Regular.ttf + NotoSans-Bold.ttf (PDF uchun, qo'lda qo'yiladi)
├── lib/
│   ├── firebase.js                  # Firebase Auth + Firestore + Storage init (client)
│   ├── firebaseAdmin.js             # Firebase Admin SDK init (faqat server/API route'lar)
│   ├── apiAuth.js                   # API route'lar uchun "faqat teacher" tekshiruvi
│   ├── accountHelpers.js            # ism/familiya validatsiyasi, login/parol generatsiyasi, unikal login bilan akkount ochish
│   ├── heartsHelpers.js             # jonlar (hearts) tizimi — 7:00 (Toshkent) chegarali "jon-kuni" hisoblash
│   ├── vaqt.js                      # Toshkent vaqti (UTC+5) yordamchilari — server zonasiga bog'liq emas
│   ├── statistikaHelpers.js         # ustoz statistikasi hisob-kitoblari (toza funksiyalar)
│   ├── sinfEgaligi.js               # sinf/o'quvchi ustozniki ekanini tekshirish (izolyatsiya)
│   ├── studentAccount.js            # createStudentAccount() — yakka va ommaviy qo'shish uchun umumiy
│   ├── ommaviyHelpers.js            # Ko'plab qo'shish: matnni ajratish, validatsiya, takrorlarni topish
│   ├── pdfVaraqchalar.js            # 3×5 login/parol varaqchalari PDF (jsPDF + Noto Sans)
│   ├── bonusMantiq.js / bonusHelpers.js  # bonus jon: toza mantiq / Firestore o'qish
│   ├── testToast.js                 # test toast'lari mantig'i
│   └── viloyatlar.js                # Viloyat dropdown ro'yxati
├── types.ts                         # Firestore kolleksiyalari uchun tip ta'riflari
├── firestore.rules                  # MVP Firestore xavfsizlik qoidalari (Firebase konsoliga joylashtiring)
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
├── tsconfig.json
├── .env.local.example
└── package.json
```

## Firestore kolleksiyalari

`users`, `classes`, `mavzular`, `savollar`, `urinishlar`, `jonlar` — to'liq maydonlar uchun `types.ts` fayliga qarang.

## O'rnatish

```bash
npm install                        # jspdf ham o'rnatiladi (PDF varaqchalar uchun)
cp .env.local.example .env.local   # so'ng Firebase konsolidan olingan qiymatlarni to'ldiring
npm run dev
```

Shuningdek, Firebase konsolida:
1. **Authentication > Sign-in method**'da "Email/Password" provayderini yoqing.
2. **Firestore Database**'ni yarating (agar hali yaratilmagan bo'lsa).
3. `firestore.rules` faylidagi qoidalarni **Firestore Database > Rules** bo'limiga joylashtiring va nashr qiling — bularsiz ro'yxatdan o'tish/kirish ishlamaydi (Firestore standart holatda barcha so'rovlarni rad etadi).
4. **Project settings > Service accounts** bo'limidan "Generate new private key" orqali xizmat hisobi (service account) JSON faylini yuklab oling va undagi `project_id` / `client_email` / `private_key` qiymatlarini `.env.local`dagi `FIREBASE_ADMIN_*` o'zgaruvchilariga joylashtiring — bularsiz ustoz o'quvchi qo'sha olmaydi va parol yangilay olmaydi (`app/api/teacher/**`).

### PDF shrifti (4-bosqich — majburiy qo'lda qadam)

"Chop etish (PDF)" Unicode shrift talab qiladi: jsPDF'ning ichki shriftlari `ʻ`/`ʼ` belgilarini
chiza olmaydi, login esa asl belgilar bilan saqlanadi. Quyidagi ikki faylni **Noto Sans**
(Google Fonts, OFL litsenziyasi; statik `.ttf`, o'zgaruvchan/`.otf`/`.woff` EMAS) dan olib qo'ying:

```
public/fonts/NotoSans-Regular.ttf
public/fonts/NotoSans-Bold.ttf
```

Fayl topilmasa PDF yaratilmaydi va aniq xato ko'rsatiladi (belgi jimgina `'` ga almashtirilmaydi —
noto'g'ri login bolani akkountdan qulflab qo'yardi). Ixtiyoriy: `.env.local`da `NEXT_PUBLIC_SITE_URL`.

## Joylashtirish (Netlify)

Netlify'ning rasmiy Next.js runtime plagini avtomatik SSR/Server Components va Route Handler'larni (`app/api/**`) qo'llab-quvvatlaydi — qo'shimcha sozlash shart emas. To'liq static export (`next.config.js`dagi `output: 'export'`) endi ishlatilmaydi, chunki `app/api/teacher/**` server-side Route Handler'lardir.

Environment o'zgaruvchilarini (`NEXT_PUBLIC_FIREBASE_*` va `FIREBASE_ADMIN_*`) Netlify saytining Environment variables bo'limiga qo'shishni unutmang. `FIREBASE_ADMIN_PRIVATE_KEY`ni qo'shtirnoq ichida, qatorlarni `\n` bilan almashtirib kiriting.

## Holat

**7-PROMPT bajarildi — barcha 7 promt tayyor (MVP to'liq).**

Ishlaydigan qismlar (1–4-PROMPT):
- Bosh sahifa: Kirish / Ro'yxatdan o'tish (O'quvchi yoki Ustoz tanlovi bilan).
- O'quvchi va Ustoz ro'yxatdan o'tishi, kirish sahifasi (2-PROMPT).
- Ustoz paneli (`app/teacher/**`): sinf yaratish, o'quvchi qo'shish, login/parol boshqarish, sinfdan chiqarish (3-PROMPT).
- O'quvchi paneli (`app/student/**`): faqat `role === "student"` bo'lganlar kira oladi (auth guard, `StudentAuthProvider`).
  - Yuqori panel (`StudentHeader`): qolgan jonlar (`❤️❤️❤️❤️🖤 4/5`, realtime) + chiqish tugmasi.
  - Asosiy sahifa (`app/student/page.js`): `mavzular` ro'yxati, har birida shu o'quvchining o'sha mavzudagi ENG YUQORI foizi (tugallangan urinishlar orasidan hisoblanadi) yoki "Hali ishlanmagan".
  - Test ishlash sahifasi (`app/student/test/[mavzuId]/page.js`):
    - Jon 0 bo'lsa va tugallanmagan urinish yo'q bo'lsa — test boshlanmaydi, xabar chiqadi.
    - Tugallanmagan ("jarayonda") urinish bo'lsa — "Davom ettirasizmi?" taklif qilinadi, jon qayta olinmaydi.
    - Yangi test boshlansa — savollar va har savolning 4 varianti tasodifiy aralashtiriladi, `urinishlar` hujjati ochiladi, 1 jon kamayadi.
    - Har javobdan keyin to'g'ri/noto'g'ri rang bilan ko'rsatiladi, Firestore'ga darhol yoziladi (chiqib ketilsa ham progress saqlanadi); oxirida "X/Y to'g'ri (Z%)" natija ekrani.
  - Yordamchi: `lib/heartsHelpers.js` — jonlarning har kuni 7:00da (mahalliy vaqt) tiklanish mantig'i.
- `firestore.rules`ga `mavzular`, `savollar` (o'qish — har qanday kirgan foydalanuvchi), `urinishlar` va `jonlar` (faqat egasi) uchun qoidalar qo'shildi.
- Akkount sahifalari (5-PROMPT):
  - `app/student/account/page.js`: Ism, Familiya, umumiy ball, Viloyat ko'rsatiladi; "Tahrirlash" — Ism/Familiya/Viloyat formasi (login o'zgarmaydi); "Chiqish".
  - `app/teacher/account/page.js`: Ism, Familiya, Maktab/markaz, Viloyat, jami sinflar va o'quvchilar soni (realtime); xuddi shunday Tahrirlash (Ism/Familiya/Viloyat) va Chiqish.
  - `StudentHeader` va `TeacherHeader`ga "Akkount" navigatsiya havolasi qo'shildi.
- Admin sahifasi (6-PROMPT):
  - `app/admin/page.js`: Firebase Auth emas, oddiy umumiy parol bilan himoyalangan (parol shu brauzer sessiyasida saqlanadi). Barcha "teacher" va mustaqil ("student" + `classId == null`) foydalanuvchilar ro'yxati, ism-familiya bo'yicha qidiruv.
  - Foydalanuvchi tanlansa: `maxfiySoz` ko'rsatiladi (admin buni Telegram javobi bilan qo'lda solishtiradi) va "Yangi parol yarat" tugmasi.
  - `app/api/admin/users` (GET) va `app/api/admin/reset-password` (POST) — Admin SDK orqali, `lib/apiAuth.js`dagi `requireAdmin` bilan himoyalangan (`x-admin-password` header, server tarafda `ADMIN_SECRET_PASSWORD`ga solishtiriladi).
  - Parol darvozasi va navigatsiya umumiy qobiqqa chiqarildi: `app/admin/AdminAuthProvider.js` (Context + `fetchAdmin` yordamchisi, 401 kelsa avtomatik qayta parol so'raydi) va `app/admin/AdminHeader.js`, ikkalasi ham `app/admin/layout.js` orqali `/admin` ostidagi barcha sahifalarga ulanadi.
- Test kontent kiritish (7-PROMPT):
  - `app/admin/questions/page.js`: mavzu tanlash (dropdown) yoki yangi mavzu yaratish (nom kiritib — tartib avtomatik hisoblanadi); tanlangan mavzuga savol qo'shish formasi (matn, 4 variant, radio bilan to'g'ri javob).
  - Qo'shilgan savollar ro'yxati shu mavzu ostida ko'rinadi — har biri "Tahrirlash" (forma qayta to'ldiriladi) va "O'chirish" (tasdiqlash bilan) tugmalari bilan.
  - `app/api/admin/mavzular` (GET/POST) va `app/api/admin/savollar` (GET/POST) + `app/api/admin/savollar/[id]` (PATCH/DELETE) — barchasi Admin SDK orqali, `requireAdmin` bilan himoyalangan.

### 3-, 4- va 5-bosqichlar

- **Vaqt zonasi tuzatishi:** `lib/vaqt.js` (Asia/Tashkent, UTC+5, yozgi vaqt yo'q). `davrOraligi()` va
  `jonSanasi()` endi server zonasiga bog'liq emas: "Bugungi/Kechagi" chegarasi Toshkent 00:00, jonlar
  yangilanishi Toshkent 07:00 (avval Netlify/UTC'da mos ravishda 05:00 va 12:00 edi).
  "Haftalik" = oxirgi 7×24 soat.
- **3 — Ustoz statistikasi:** sinf sahifasida O'quvchilar | Statistika; 5 tab (Reyting bilan bir xil ball
  qoidasi), test ishlamaganlar 0 ball bilan pastda; urinishlar/tugallangan/tugallanmagan/oxirgi faollik.
  Ism bosilsa `student/[studentId]` sahifasi (filtr URL query'da: `?davr=...&mavzuId=...`) — akkount +
  urinishlar tarixi. Faqat ustozga; `/api/student/**` o'zgarmagan. Boshqa ustoz sinfi/o'quvchisi → 404.
- **4 — Ommaviy qo'shish + PDF:** `class/[id]/ommaviy` (kiritish → preview → yaratish, 10 tadan bo'lak,
  "Qayta urinish" faqat yaratilmaganlarga; "Hammasini nusxalash" ataylab yo'q). 3×5 PDF varaqchalar
  (`lib/pdfVaraqchalar.js`), sinf sahifasida ham "Chop etish (PDF)" (hashteg o'quvchilari o'tkaziladi).
  Akkount yaratish `lib/studentAccount.js`ga chiqarildi (yakka route xulqi o'zgarmagan).
- **5A — Bonus jon:** admin `/admin/bonus`dan +1…+5 jon (muddat: ertaga 07:00 gacha / 3 kun / qo'lda).
  Hujjat `sozlamalar/bonusJon` (faqat server). `qolgan = max(0, 5 + bonus − ishlatilgan)`; header `x/jami`,
  bosh sahifada e'lon banneri.
- **5B — Test ichida:** progress bar + 3 ta motivatsion toast (boshlanish / 50% / tugash), har biri
  urinishda bir marta; davom ettirishda boshlanish va o'tilgan 50% toasti chiqmaydi.

**MVP cheklovlari (bilib qo'ying):**
- ~~`savollar` kolleksiyasi client tarafdan to'g'ridan-to'g'ri o'qiladi...~~ — **tuzatildi**, quyida qarang.
- ~~Mustaqil o'quvchida maxfiy so'z yo'q~~ — **tuzatildi**: ro'yxatdan o'tishda `maxfiySoz` so'raladi. Sinfdagi (ustoz yaratgan) o'quvchida u bo'lmaydi; ular parolini ustozidan oladi. Ustoz sinfdan chiqargan o'quvchida esa maxfiy so'z bo'lmasligi mumkin (admin panelida "belgilanmagan" ko'rinadi).

Hali TODO (ixtiyoriy, keyingi qadamlar): eski `app/teacher/classes` va `app/teacher/students` sahifalarini olib tashlash/qayta yo'naltirish (3-PROMPT'dan qolgan, ishlatilmaydi); haqiqiy loyihada `npm install` + `npm run dev` bilan mahalliy sinov (bu suhbatda internet cheklangani uchun bajarilmadi, faqat kod ko'rib chiqildi).

## Xavfsizlik yaxshilanishi: test mexanizmi serverga ko'chirildi

Ilgari `savollar`, `urinishlar` va `jonlar` kolleksiyalari client Firestore SDK orqali to'g'ridan-to'g'ri o'qilar/yozilardi — bu degani `togriJavobIndex` (to'g'ri javob) ham brauzerga tushardi (DevTools orqali ko'rinardi). Endi bularning barchasi FAQAT serverda (Admin SDK) ishlaydi:

- `lib/testEngine.js` — aralashtirish, jon o'qish, "xavfsiz" (to'g'ri javobsiz) savollar ro'yxatini qurish.
- `lib/apiAuth.js` — `requireStudent()` qo'shildi (Firebase ID token orqali, `requireTeacher` bilan bir xil naqsh).
- `app/api/student/dashboard` (GET) — mavzular + eng yuqori foizlar + qolgan jon, bitta so'rovda.
- `app/api/student/hearts` (GET) — faqat qolgan jon (header uchun yengil).
- `app/api/student/test/start` (POST) — yangi test boshlaydi yoki tugallanmaganini davom ettiradi; javobda **hech qachon** to'g'ri javob yo'q.
- `app/api/student/test/answer` (POST) — bitta savolga javobni serverda tekshiradi, faqat SHU savol uchun (javobdan keyin) to'g'ri/noto'g'ri va to'g'ri variant pozitsiyasini qaytaradi.
- `app/student/page.js`, `app/student/test/[mavzuId]/page.js`, `app/student/AuthProvider.js` — endi Firestore'ga emas, shu API'larga murojaat qiladi.
- `firestore.rules` — `savollar`, `urinishlar`, `jonlar` endi client uchun to'liq yopiq (`allow read, write: if false`); faqat Admin SDK (server) kira oladi. `mavzular` o'zgarmadi (nomi/tartibi sezgir emas).

Natija: o'quvchi DevTools yoki tarmoq so'rovlarini kuzatsa ham, to'g'ri javobni javob berishdan oldin hech qanday yo'l bilan ko'ra olmaydi.

## 1-bosqich: Admin paneli (parol so'rovlari, o'chirish, ustozdan xabar)

**1.1 Mustaqil o'quvchi / ustoz parolni tiklash.** Kirish oynasida "Parolni unutdingizmi?" → Ism, Familiya, Viloyat (o'quvchi yoki ustoz tanlanadi) → "Jo'natish". So'rov `parolSorovlari` kolleksiyasiga tushadi (`app/api/auth/mustaqil-parol-sorovi`; faqat bazada shunday mustaqil o'quvchi/ustoz bor bo'lsagina yoziladi — begona odam ro'yxatni yolg'on so'rovlar bilan to'ldira olmasin, javob esa har doim bir xil), ekranda nusxa qilinadigan matn ("Ali Valiyev, Toshkent shahri"), adminning Telegram havolasi va izoh chiqadi. Admin panelida yangi **Parol so'rovlari** bo'limi (`/admin/parol-sorovlari`): har so'rov ostida bazadan mos foydalanuvchilar (ism/familiya katta-kichik harf va apostrofga e'tiborsiz, viloyat teng, mustaqil o'quvchi yoki ustoz) maxfiy so'zlari bilan ko'rinadi. Admin Telegramda maxfiy so'zni solishtiradi, so'ng "Mavjud parolni ko'rsatish" (saqlangan parol bo'lsa) yoki "Yangilash (yangi parol)" bosadi va "Bajarildi" bilan so'rovni o'chiradi. Hashteg orqali sinfga qo'shilgan o'quvchining eski oqimi (ustozga so'rov) saqlangan.

**1.2 O'chirish.** `/admin`da ustoz yoki mustaqil o'quvchi tasdiqlash oynasi bilan o'chiriladi (`DELETE /api/admin/users/[uid]`). Ustoz o'chirilsa, uning o'quvchilari `classId = null` bo'lib qoladi (ustoz sinfdan chiqargandagi bilan bir xil holat); sinflari, xabarlari va so'rovlari o'chadi. O'quvchi o'chirilsa: urinishlar, jonlar, so'rovlar. Ikkala holatda Firebase Auth akkaunti va login ham bo'shaydi.

**1.3 Ustozdan adminga xabar.** Ustoz Akkount > "Adminga xabar yuborish" (`ustozXabarlari`). Admin `/admin/xabarlar` ("Ustozdan xabar") da javob yozadi; javob ustozning Xabarlar (inbox) qismiga **"Admin"** belgisi bilan tushadi (`messages`, `tur = "admin_javob"`), o'zi o'chib ketmaydi — ustoz o'zi o'chiradi. Yangi (ochilmagan) admin javobi ustoz panelidagi qizil belgini yoqadi, sahifa ochilgach belgi o'chadi.

Admin yuqori panelida "Parol so'rovlari" va "Ustozdan xabar" yonida qizil belgi (kutilayotgan/javobsiz soni, `count()` agregatsiyasi bilan — deyarli bepul).

Yangi sozlama: `NEXT_PUBLIC_ADMIN_TELEGRAM` (`.env.local.example`ga qarang). Yangi kolleksiyalar: `parolSorovlari`, `ustozXabarlari` (ikkalasi ham faqat server; `firestore.rules`ga qo'shildi). Yangi Firestore indeks kerak emas.

## 3-bosqich (Yangiliklar) — 3-A: ma'lumot modeli, admin API, admin sahifasi

- Kolleksiyalar (ikkalasi client uchun yopiq, faqat Admin SDK): `yangiliklar/{id}` va
  `yangilikYuborishlar/{ustozId}_{yangilikId}` (matn nusxalanmaydi — asl hujjatga havola).
- `lib/yangilikHelpers.js` (matn tekshiruvi 1–4000 belgi, oddiy matn, "tahrirlangan dd.mm.yyyy HH:MM"),
  `lib/yangilikServer.js` (JSON, sahifalash kursori, tozalash).
- Admin API: `GET/POST /api/admin/yangiliklar`, `PATCH/DELETE /api/admin/yangiliklar/[id]`;
  sahifa `/admin/yangiliklar`. Yangi indeks: `yangiliklar` — `muallifRoli` (O'sish) + `yaratilgan` (Kamayish).
- Admin o'chirilganda post bilan birga uning yuborishlari ham o'chadi; ustoz o'chirilganda uning postlari
  va yuborishlari ham o'chadi.

## 3-bosqich — 3-B: ustoz va o'quvchi qismi

- Ustoz: `/teacher/yangiliklar` (Orqaga tugmasi bilan; `/teacher` da "Mening sinflarim" yonida
  "Yangiliklar"). "Admindan" — admin postlarini sinflarga yuborish (`yangilikYuborishlar/{ustozId}_{yangilikId}`,
  matn nusxalanmaydi, qayta yuborilsa ustiga yoziladi, "Yuborishni bekor qilish" hujjatni o'chiradi);
  "Mening yangiliklarim" — o'z postlarini yaratish/tahrirlash/o'chirish.
  API: `/api/teacher/yangiliklar` (GET/POST), `/api/teacher/yangiliklar/[id]` (PATCH/DELETE),
  `/api/teacher/yangiliklar/admindan` (GET), `/api/teacher/yangiliklar/admindan/[id]` (POST/DELETE).
- O'quvchi: `app/student/page.js` da "Mavzular | Yangiliklar" tablari (`YangiliklarTab.js`, lazy);
  API `/api/student/yangiliklar` (GET). Sinfdagi o'quvchi: ustozning sinfga yo'naltirilgan postlari +
  ustoz yuborgan admin postlari; mustaqil o'quvchi: `mustaqilga: true` admin postlari. Sinf ID'si
  serverda o'quvchining `users` hujjatidan olinadi.
- Ikki manbani sahifalash: `lib/yangilikFeed.js` (yagona tartib + kursor "sekund:nanosekund:tur:id").
- Yangi indekslar: `yangiliklar` — `ustozlarga`+`yaratilgan`↓; `muallifId`+`yaratilgan`↓;
  `mustaqilga`+`yaratilgan`↓; `classIds`(Arrays)+`yaratilgan`↓; `yangilikYuborishlar` —
  `classIds`(Arrays)+`yuborilgan`↓.
