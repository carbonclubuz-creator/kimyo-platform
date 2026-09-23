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
│   │   ├── layout.js                # student shell (auth guard, jonlar ko'rsatkichi) — TODO
│   │   ├── page.js                  # mavzular ro'yxati
│   │   └── test/[mavzuId]/page.js   # test ishlash sahifasi
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

**3-PROMPT bajarildi — Ustoz paneli.**

Ishlaydigan qismlar:
- Bosh sahifa: Kirish / Ro'yxatdan o'tish (O'quvchi yoki Ustoz tanlovi bilan).
- O'quvchi va Ustoz ro'yxatdan o'tishi, kirish sahifasi (2-PROMPT).
- Ustoz paneli (`app/teacher/**`): faqat `role === "teacher"` bo'lganlar kira oladi (auth guard).
  - Asosiy sahifa: ustozga tegishli sinflar ro'yxati, "Sinf yaratish" modali (sinf bo'lmasa ham tugma har doim ko'rinadi).
  - Sinf ichi sahifasi: o'quvchilar jadvali (Ism-Familiya, Login, ko'z ikonkasi bilan yashirin/ko'rsatiladigan Parol, nusxalash tugmalari).
  - "O'quvchi qo'shish": ism/familiya so'raydi, login-parol avtomatik generatsiya qilinadi, viloyat/tuman ustozdan meros olinadi, `classId` shu sinfga o'rnatiladi.
  - "Yangi parol yarat": istalgan vaqt bosilishi mumkin, yangi 8 xonali parolni Firebase Auth'da ham, Firestore'da ham yangilaydi.
  - "Tahrirlash" → "O'chirish" → tasdiqlash: o'quvchining `classId`sini `null` qiladi (akkounti o'chirilmaydi).
  - O'quvchi akkounti yaratish va parol yangilash `app/api/teacher/**` Route Handler'lari (Firebase Admin SDK) orqali bajariladi — bu ustozning joriy sessiyasini buzmasdan va boshqa odamning parolini xavfsiz yangilash imkonini beradi.

Hali TODO (keyingi promtlarda): `student` layout'idagi auth guard va navigatsiya, mavzular ro'yxati, test ishlash oqimi, jonlar tizimi, admin paneli, eski `app/teacher/classes` va `app/teacher/students` sahifalarini olib tashlash/qayta yo'naltirish.
