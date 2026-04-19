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
| Database | PostgreSQL                  |
| Frontend | Vanilla HTML/CSS/JS         |
| Deploy   | Any platform (Heroku, Docker, etc.) |
| Font     | Space Mono + DM Sans        |

---

## 🚀 Deploy Anywhere

### 1. Clone the repository
```bash
git clone https://github.com/USERNAME/roomchat.git
cd roomchat
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file:
```env
PORT=3000
POSTGRES_DB=postgresql://username:password@host:port/database
```

### 4. Start the application
```bash
npm start
```

### 5. Open your browser
Visit `http://localhost:3000` to use the chat app.

---

## 🐳 Docker Deployment (Optional)

You can also deploy using Docker:
```bash
docker build -t roomchat .
docker run -p 3000:3000 -e PORT=3000 -e POSTGRES_DB=your-postgres-url roomchat
```

### 6. Update BACKEND_URL
Edit `public/chat.js` baris paling atas:
```js
const BACKEND_URL = "nama-app-kamu.up.railway.app";
```
Push → Railway auto-redeploy.

---

## 📁 Project Structure
```
roomchat/
├── public/
│   ├── index.html      # Main UI
│   ├── style.css       # Styling (terminal/hacker aesthetic)
│   └── chat.js         # Frontend logic + WebSocket client
├── server.js           # Backend: Express + WebSocket + PostgreSQL
├── package.json
└── railway.toml        # Railway deployment config (optional)
```

---

## ⚙️ Environment Variables

| Variable      | Keterangan                              |
|---------------|-----------------------------------------|
| `PORT`        | Port number for the server (default: 3000) |
| `POSTGRES_DB` | PostgreSQL connection string            |

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