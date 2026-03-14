const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { Pool } = require('pg');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server nyala di port ${PORT}`));

// ─── POSTGRESQL ───────────────────────────────
// Railway otomatis inject DATABASE_URL ke environment
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Buat tabel kalau belum ada
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id        SERIAL PRIMARY KEY,
            room_id   VARCHAR(10)  NOT NULL,
            username  VARCHAR(20)  NOT NULL,
            message_text TEXT      NOT NULL,
            timestamp TIMESTAMPTZ  DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
    `);
    console.log('DB siap');
}
initDB().catch(console.error);

async function getHistory(roomId) {
    try {
        const result = await pool.query(
            `SELECT username, message_text, timestamp
             FROM messages
             WHERE room_id = $1
             ORDER BY timestamp ASC
             LIMIT 50`,
            [roomId]
        );
        return result.rows;
    } catch (e) {
        console.error('getHistory error:', e);
        return [];
    }
}

async function saveMessage(roomId, username, text) {
    try {
        await pool.query(
            `INSERT INTO messages (room_id, username, message_text)
             VALUES ($1, $2, $3)`,
            [roomId, username, text]
        );
    } catch (e) {
        console.error('saveMessage error:', e);
    }
}

// ─── WEBSOCKET ────────────────────────────────
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
    const url    = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;

    const action    = params.get('action');
    let roomId      = params.get('room');
    const userLimit = Math.min(parseInt(params.get('limit')) || 2, 20);
    const username  = (params.get('username') || 'Anonymous').substring(0, 20);

    // Validasi join
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
        ws.send(JSON.stringify({ error: `Room sudah penuh! (max ${rooms[roomId].limit} user)` }));
        return ws.close();
    }

    rooms[roomId].users.add(ws);
    ws.roomId   = roomId;
    ws.username = username;

    // Kirim init
    ws.send(JSON.stringify({
        type: 'init',
        roomId,
        username,
        userCount: rooms[roomId].users.size,
        userLimit: rooms[roomId].limit
    }));

    // Kirim history dari PostgreSQL
    const history = await getHistory(roomId);
    if (history.length > 0) {
        ws.send(JSON.stringify({ type: 'history', data: history }));
    }

    // Notif join
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
                broadcast(roomId, { type: 'typing', username, isTyping: data.isTyping }, ws);
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
            console.error('Pesan error:', e);
        }
    });

    ws.on('close', () => {
        if (rooms[roomId]) {
            rooms[roomId].users.delete(ws);
            if (rooms[roomId].users.size === 0) {
                delete rooms[roomId];
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