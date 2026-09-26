# Kimyo Platformasi (MVP)

Duolingo uslubidagi kimyo ta'lim platformasi. Next.js (App Router) + Firebase + Tailwind CSS, Netlify'da joylashtiriladi.

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
│   │   └── teacher/
│   │       ├── students/route.js         # POST — o'quvchi qo'shish (Admin SDK)
│   │       └── reset-password/route.js   # POST — o'quvchi parolini yangilash (Admin SDK)
│   ├── teacher/
│   │   ├── layout.js                # auth guard (role === "teacher") + yuqori panel
│   │   ├── AuthProvider.js          # auth Context (user, userData, logout)
│   │   ├── TeacherHeader.js         # yuqori panel (ism, chiqish)
│   │   ├── page.js                  # ustoz paneli: sinflar ro'yxati + sinf yaratish
│   │   ├── class/[id]/page.js       # sinf ichi: o'quvchilar, login/parol, parol tiklash
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
│       └── questions/page.js        # savollar bazasini boshqarish
├── components/
│   ├── CredentialsCard.js           # generatsiya qilingan login/parolni ko'rsatish (nusxalash tugmasi)
│   ├── Modal.js                     # umumiy overlay modal
│   └── icons.js                     # kichik SVG ikonkalar (ko'z, nusxalash)
├── lib/
│   ├── firebase.js                  # Firebase Auth + Firestore + Storage init (client)
│   ├── firebaseAdmin.js             # Firebase Admin SDK init (faqat server/API route'lar)
│   ├── apiAuth.js                   # API route'lar uchun "faqat teacher" tekshiruvi
│   ├── accountHelpers.js            # ism/familiya validatsiyasi, login/parol generatsiyasi, unikal login bilan akkount ochish
│   ├── heartsHelpers.js             # jonlar (hearts) tizimi — 7:00 chegarali "jon-kuni" hisoblash
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
npm install
cp .env.local.example .env.local   # so'ng Firebase konsolidan olingan qiymatlarni to'ldiring
npm run dev
```

Shuningdek, Firebase konsolida:
1. **Authentication > Sign-in method**'da "Email/Password" provayderini yoqing.
2. **Firestore Database**'ni yarating (agar hali yaratilmagan bo'lsa).
3. `firestore.rules` faylidagi qoidalarni **Firestore Database > Rules** bo'limiga joylashtiring va nashr qiling — bularsiz ro'yxatdan o'tish/kirish ishlamaydi (Firestore standart holatda barcha so'rovlarni rad etadi).
4. **Project settings > Service accounts** bo'limidan "Generate new private key" orqali xizmat hisobi (service account) JSON faylini yuklab oling va undagi `project_id` / `client_email` / `private_key` qiymatlarini `.env.local`dagi `FIREBASE_ADMIN_*` o'zgaruvchilariga joylashtiring — bularsiz ustoz o'quvchi qo'sha olmaydi va parol yangilay olmaydi (`app/api/teacher/**`).

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

**MVP cheklovlari (bilib qo'ying):**
- `savollar` kolleksiyasi client tarafdan to'g'ridan-to'g'ri o'qiladi, shuning uchun `togriJavobIndex` ham brauzerga tushadi (texnik bilimi bor o'quvchi DevTools orqali ko'rishi mumkin). Sodda ichki test tizimi uchun bu qabul qilingan MVP darajasidagi murosa.
- 0-QISM sxemasida `maxfiySoz` "faqat teacher uchun" deb belgilangan, shuning uchun mustaqil o'quvchi ro'yxatdan o'tishda bu so'ralmaydi — admin sahifasida mustaqil o'quvchilar uchun bu maydon "belgilanmagan" ko'rinadi. Bu promtlar to'plamidagi spec bo'shlig'i (parolni unutgan mustaqil o'quvchini admin hozircha faqat ism-familiya bo'yicha aniqlab, boshqa yo'l bilan tasdiqlashi kerak bo'ladi).

Hali TODO (ixtiyoriy, keyingi qadamlar): eski `app/teacher/classes` va `app/teacher/students` sahifalarini olib tashlash/qayta yo'naltirish (3-PROMPT'dan qolgan, ishlatilmaydi); haqiqiy loyihada `npm install` + `npm run dev` bilan mahalliy sinov (bu suhbatda internet cheklangani uchun bajarilmadi, faqat kod ko'rib chiqildi).
