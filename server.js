const express = require('express');
const WebSocket = require('ws');

const app = express();

app.use(express.static('public'));

const server = app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url.replace('/?', ''));
  const roomId = params.get('room');

  if (!roomId) {
    ws.close();
    return;
  }

  if (!rooms[roomId]) rooms[roomId] = new Set();
  rooms[roomId].add(ws);

  ws.on('message', msg => {
    const messageData = msg.toString();
    rooms[roomId].forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(messageData);
      }
    });
  });

  ws.on('close', () => {
    rooms[roomId].delete(ws);
    if (rooms[roomId].size === 0) delete rooms[roomId];
  });
});
