const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { Pool } = require('pg');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server nyala di port ${PORT}`);
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const wss = new WebSocket.Server({ server });
const rooms = {};

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;

    const action = params.get('action');
    let roomId = params.get('room');
    const userLimit = parseInt(params.get('limit')) || 2;

    if (action === 'create') {
        roomId = generateRoomCode();
        rooms[roomId] = { users: new Set(), limit: userLimit };
    }

    if (action === 'join' && !rooms[roomId]) {
        rooms[roomId] = { users: new Set(), limit: userLimit };
    }

    if (!rooms[roomId]) {
        rooms[roomId] = { users: new Set(), limit: userLimit }; 
    }

    rooms[roomId].users.add(ws);
    ws.send(JSON.stringify({ type: 'init', roomId: roomId }));

    try {
        const history = await pool.query(
            'SELECT message_text FROM messages WHERE room_code = $1 ORDER BY created_at ASC',
            [roomId]
        );
        if (history.rows.length > 0) {
            ws.send(JSON.stringify({ type: 'history', data: history.rows }));
        }
    } catch (err) {
        console.error("Gagal narik history:", err);
    }

    ws.on('message', async msg => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.text) {
                await pool.query(
                    'INSERT INTO messages (room_code, message_text) VALUES ($1, $2)',
                    [roomId, data.text]
                );

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