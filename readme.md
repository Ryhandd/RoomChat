# [ROOMCHAT]

Private, ephemeral room-based chat app built with Node.js, WebSocket, and PostgreSQL. No account needed — just create a room, share the code, and chat.

---

## ✨ Features

- 🔐 **Private Rooms** — setiap sesi punya kode unik 6 karakter
- 👤 **Nickname** — pilih nama sebelum masuk room
- 💬 **Real-time Chat** — powered by WebSocket
- ⌨️ **Typing Indicator** — tahu kapan lawan bicara sedang mengetik
- 🔔 **Join/Leave Notifications** — notifikasi sistem saat user masuk/keluar
- 🕐 **Timestamps** — tiap pesan ada keterangan waktu
- 📜 **Chat History** — riwayat 50 pesan terakhir tersimpan di PostgreSQL
- 👥 **User Limit** — bisa set max berapa orang boleh masuk room
- 📋 **Copy Room Code** — satu klik untuk share kode room

---

## 🛠 Tech Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Backend  | Node.js, Express, ws        |
| Database | PostgreSQL (Railway)        |
| Frontend | Vanilla HTML/CSS/JS         |
| Deploy   | Railway.app                 |
| Font     | Space Mono + DM Sans        |

---

## 🚀 Deploy ke Railway

### 1. Clone & Push ke GitHub
```bash
git clone https://github.com/USERNAME/roomchat.git
cd roomchat
git push
```

### 2. Buat Project di Railway
1. Buka [railway.app](https://railway.app) → **Login with GitHub**
2. **New Project → Deploy from GitHub repo** → pilih repo ini

### 3. Tambah PostgreSQL
Di dashboard Railway → **+ New → Database → PostgreSQL**
Railway otomatis inject variable database ke service.

### 4. Link Database ke Service
Di service RoomChat → **Variables** → pastikan ada variable `POSTGRES_DB` yang berisi connection string PostgreSQL.

### 5. Generate Domain
**Settings → Networking → Generate Domain**

### 6. Update BACKEND_URL
Edit `public/chat.js` baris paling atas:
```js
const BACKEND_URL = "nama-app-kamu.up.railway.app";
```
Push → Railway auto-redeploy.

---

## 📁 Struktur Project
```
roomchat/
├── public/
│   ├── index.html      # UI utama
│   ├── style.css       # Styling (terminal/hacker aesthetic)
│   └── chat.js         # Frontend logic + WebSocket client
├── server.js           # Backend: Express + WebSocket + PostgreSQL
├── package.json
└── railway.toml        # Railway deployment config
```

---

## ⚙️ Environment Variables

| Variable      | Keterangan                              |
|---------------|-----------------------------------------|
| `PORT`        | Otomatis di-inject Railway              |
| `POSTGRES_DB` | Connection string PostgreSQL dari Railway |

---

## 💬 Cara Pakai

1. Buka URL app
2. Pilih **Create** → isi nickname + user limit → klik **Create Room**
3. Bagikan **Room Code** ke teman
4. Teman buka URL yang sama → pilih **Join** → masukkan kode → chat!

---

## 📝 Catatan

- Room otomatis dihapus dari memori saat semua user keluar
- History tersimpan max **50 pesan terakhir** per room di database
- Tidak ada enkripsi end-to-end — jangan kirim info sensitif