const express = require('express');
const WebSocket = require('ws');

const app = express();

app.use(express.static('public'));

const PORT = process.env.PORT || 3138;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server nyala di port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url.split('?')[1]);
  const action = params.get('action');
  let roomId = params.get('room');
  const userLimit = parseInt(params.get('limit')) || 2;

  if (action === 'create') {
    roomId = generateRoomCode();
    rooms[roomId] = {
      users: new Set(),
      limit: userLimit
    };
  }

  if (!rooms[roomId]) {
    ws.send(JSON.stringify({ error: 'Room tidak ditemukan' }));
    return ws.close();
  }

  if (rooms[roomId].users.size >= rooms[roomId].limit) {
    ws.send(JSON.stringify({ error: 'Room sudah penuh!' }));
    return ws.close();
  }

  rooms[roomId].users.add(ws);
  
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
