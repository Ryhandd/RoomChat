const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server nyala di port ${PORT}`);
});

const wss = new WebSocket.Server({ server });
const rooms = {};

const DB_FILE = 'history.json';

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

function getChatHistory() {
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
}

function saveChat(roomId, text) {
    const db = getChatHistory();
    if (!db[roomId]) db[roomId] = [];
    
    db[roomId].push({ message_text: text });
    
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
// ---------------------------------

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;

    const action = params.get('action');
    let roomId = params.get('room');
    const userLimit = parseInt(params.get('limit')) || 2;

    if (action === 'create') {
        roomId = generateRoomCode();
        rooms[roomId] = { users: new Set(), limit: userLimit };
    }

    if (!rooms[roomId]) {
        rooms[roomId] = { users: new Set(), limit: userLimit }; 
    }

    if (rooms[roomId].users.size >= rooms[roomId].limit) {
        ws.send(JSON.stringify({ error: 'Room sudah penuh!' }));
        return ws.close();
    }

    rooms[roomId].users.add(ws);
    ws.send(JSON.stringify({ type: 'init', roomId: roomId }));

    const historyDB = getChatHistory();
    if (historyDB[roomId] && historyDB[roomId].length > 0) {
        ws.send(JSON.stringify({ type: 'history', data: historyDB[roomId] }));
    }

    ws.on('message', msg => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.text) {
                saveChat(roomId, data.text);

                const messageData = JSON.stringify({ text: data.text });
                rooms[roomId].users.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(messageData);
                    }
                });
            }
        } catch (e) {
            console.error("Pesan error:", e);
        }
    });

    ws.on('close', () => {
        if (rooms[roomId]) {
            rooms[roomId].users.delete(ws);
            if (rooms[roomId].users.size === 0) delete rooms[roomId];
        }
    });
});