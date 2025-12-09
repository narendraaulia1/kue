# 🧁 Kue — Aplikasi Pencatat Keuangan Pribadi
**Kue** adalah aplikasi pencatat keuangan modern yang membantu pengguna mengelola pemasukan, pengeluaran, dan memahami kondisi keuangan harian dengan lebih mudah.  
Dibangun menggunakan **Next.js**, **Firebase**, dan **Tailwind CSS**, aplikasi ini berfokus pada kecepatan, keamanan, dan pengalaman pengguna yang nyaman.

## ✨ Fitur Utama

### ✔️ Autentikasi Aman
- Login dengan Email & Password  
- Login dengan Google  
- Reset password  
- Proteksi halaman untuk user login  

### ✔️ Pencatatan Transaksi
- Tambah pemasukan dan pengeluaran  
- Kategori dan grup transaksi  
- Warna hijau = pemasukan, merah = pengeluaran  
- Data tersimpan real-time di Firestore  

### ✔️ Dashboard Modern
- Ringkasan pemasukan & pengeluaran  
- Daftar transaksi terbaru  
- Tampilan dark mode elegan  

### ✔️ Pengaturan Akun
- Edit nama pengguna  
- Preferensi tampilan  
- Logout  

## 🎯 Visi & Misi

### **Visi**
Menjadi aplikasi pencatat keuangan paling sederhana dan nyaman digunakan oleh siapa saja.

### **Misi**
1. Membantu pengguna membangun kebiasaan finansial sehat.  
2. Menyediakan alat pencatatan yang cepat, ringan, dan mudah dipahami.  
3. Menghadirkan pengalaman pengguna yang aman dan modern.  

## 🛠️ Tech Stack

- **Next.js 14 (App Router)**  
- **Firebase Authentication & Firestore**  
- **Tailwind CSS**  
- **Lucide React Icons**  
- **Vercel Deployment**  

## 📦 Instalasi

Clone repository:

```bash
git clone https://github.com/your-username/kue.git
cd kue
```

Install dependencies:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Akses aplikasi di:

```
http://localhost:3000
```

## 🔐 Konfigurasi Environment Variable

Buat file `.env.local` dan masukkan konfigurasi Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=xxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxx
```

## 🔥 Firestore Security Rules

Gunakan rules berikut agar data aman:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId}/transactions/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🌐 Deploy ke Vercel

1. Push project ke GitHub  
2. Masuk ke https://vercel.com  
3. Import repository  
4. Tambahkan environment variables  
5. Klik **Deploy**  

## 🧱 Struktur Folder

```
app/
 ├─ login/
 ├─ register/
 ├─ dashboard/
 ├─ settings/
 ├─ layout.js
 └─ page.js

components/
lib/
 ├─ firebase.js
 └─ auth-context.js

public/
```

## 📈 Rencana Pengembangan

- Export data ke CSV / PDF  
- Grafik keuangan  
- Notifikasi pengingat transaksi  
- Mode offline  
- Insight AI (opsional)  

## 🧁 Makna Nama “Kue”

Nama **Kue** menggambarkan konsep sederhana dan manis—seperti aplikasi ini yang ingin membantu pengguna memahami potongan demi potongan keuangan mereka, hingga menjadi gambaran besar yang utuh.

## ❤️ Pengembang

Aplikasi ini dikembangkan dengan fokus pada kesederhanaan, keamanan, dan kenyamanan pengguna.  
Terinspirasi dari kebutuhan pencatat keuangan yang cepat, ringan, dan mudah dipakai.
