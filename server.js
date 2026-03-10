const express = require('express');
const WebSocket = require('ws');

const app = express();

app.use(express.static('public'));

const PORT = process.env.PORT || 3000; // Pterodactyl biasanya pakai port dari env
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

const rooms = {}; // Struktur: { roomId: { users: Set, limit: number } }

// Fungsi buat generate kode random (misal: 6 karakter)
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url.split('?')[1]);
  const action = params.get('action'); // 'create' atau 'join'
  let roomId = params.get('room');
  const userLimit = parseInt(params.get('limit')) || 2;

  // LOGIKA CREATE ROOM
  if (action === 'create') {
    roomId = generateRoomCode();
    rooms[roomId] = {
      users: new Set(),
      limit: userLimit
    };
  }

  // LOGIKA JOIN & VALIDASI
  if (!rooms[roomId]) {
    ws.send(JSON.stringify({ error: 'Room tidak ditemukan' }));
    return ws.close();
  }

  if (rooms[roomId].users.size >= rooms[roomId].limit) {
    ws.send(JSON.stringify({ error: 'Room sudah penuh!' }));
    return ws.close();
  }

  // Tambahkan user ke room
  rooms[roomId].users.add(ws);
  
  // Kasih tau user roomId-nya (penting buat yang 'create')
  ws.send(JSON.stringify({ type: 'init', roomId: roomId }));

  ws.on('message', msg => {
    const messageData = msg.toString();
    rooms[roomId].users.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(messageData);
      }
    });
  });

  ws.on('close', () => {
    if (rooms[roomId]) {
      rooms[roomId].users.delete(ws);
      if (rooms[roomId].users.size === 0) delete rooms[roomId];
    }
  });
});
