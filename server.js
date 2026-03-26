const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const admin = require('firebase-admin');

const serviceAccount = require("./roomchat-ryzu-firebase-adminsdk-fbsvc-4c970dd568.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/ping', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3265;
const server = app.listen(PORT, () => console.log(`🚀 Server nyala di port ${PORT}`));

async function getHistory(roomId) {
    try {
        const snapshot = await db.collection('messages')
            .where('room_id', '==', roomId)
            .orderBy('timestamp', 'asc').limit(50).get();
        return snapshot.docs.map(doc => ({
            username: doc.data().username,
            message_text: doc.data().message_text,
            timestamp: doc.data().timestamp?.toDate?.().toISOString() || new Date().toISOString()
        }));
    } catch (e) { return []; }
}

async function saveMessage(roomId, username, text) {
    try {
        await db.collection('messages').add({
            room_id: roomId,
            username: username,
            message_text: text,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.error(e); }
}

const wss = new WebSocket.Server({ server });
const rooms = {};

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function broadcast(roomId, data, excludeWs = null) {
    if (!rooms[roomId]) return;
    const msg = JSON.stringify(data);
    rooms[roomId].users.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;

    const action = params.get('action');
    let roomId = params.get('room');
    const userLimit = Math.min(parseInt(params.get('limit')) || 2, 20);
    const username = (params.get('username') || 'Anonymous').substring(0, 20);

    if (action === 'join') {
        if (!roomId || !rooms[roomId]) {
            ws.send(JSON.stringify({ error: 'Room tidak ditemukan! Cek kode lagi.' }));
            return ws.close();
        }
    }

    if (action === 'create') {
        roomId = generateRoomCode();
        rooms[roomId] = { users: new Set(), limit: userLimit };
    }

    if (!rooms[roomId]) {
        rooms[roomId] = { users: new Set(), limit: userLimit };
    }

    if (rooms[roomId].users.size >= rooms[roomId].limit) {
        ws.send(JSON.stringify({ 
            error: `Room sudah penuh! (max ${rooms[roomId].limit} user)` 
        }));
        return ws.close();
    }

    rooms[roomId].users.add(ws);
    ws.roomId = roomId;
    ws.username = username;

    ws.send(JSON.stringify({
        type: 'init',
        roomId,
        username,
        userCount: rooms[roomId].users.size,
        userLimit: rooms[roomId].limit
    }));

    const history = await getHistory(roomId);
    if (history.length > 0) {
        ws.send(JSON.stringify({ type: 'history', data: history }));
    }

    broadcast(roomId, {
        type: 'system',
        text: `${username} bergabung`,
        userCount: rooms[roomId].users.size,
        userLimit: rooms[roomId].limit
    }, ws);

    ws.on('message', async msg => {
        try {
            const data = JSON.parse(msg.toString());

            if (data.type === 'typing') {
                broadcast(roomId, {
                    type: 'typing',
                    username,
                    isTyping: data.isTyping
                }, ws);
                return;
            }

            if (data.text) {
                const timestamp = new Date().toISOString();
                await saveMessage(roomId, username, data.text);
                broadcast(roomId, {
                    type: 'message',
                    username,
                    text: data.text,
                    timestamp
                }, ws);
            }
        } catch (e) {
            console.error('Message error:', e);
        }
    });

    ws.on('close', () => {
        if (rooms[roomId]) {
            rooms[roomId].users.delete(ws);

            if (rooms[roomId].users.size === 0) {
                delete rooms[roomId];
                console.log(`Room ${roomId} dihapus (kosong)`);
            } else {
                broadcast(roomId, {
                    type: 'system',
                    text: `${username} keluar`,
                    userCount: rooms[roomId].users.size,
                    userLimit: rooms[roomId].limit
                });
            }
        }
    });
});