const chatApp     = document.getElementById('chat-app');
const lobby       = document.getElementById('lobby');
const chatDiv     = document.getElementById('chat');
const input       = document.getElementById('message');
const displayCode = document.getElementById('display-code');
const userCountEl = document.getElementById('user-count');
const userLimitEl = document.getElementById('user-limit');
const typingText  = document.getElementById('typing-text');

let socket = null;
let typingTimer = null;
let isTyping = false;
let currentlyTyping = new Set();
let typingTimeouts  = {};

const BACKEND_URL = "node2.lunes.host:3265";

// ── TAB ────────────────────────────────────────
function showTab(tab) {
    document.getElementById('create-tab').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('join-tab').style.display   = tab === 'join'   ? 'block' : 'none';
    document.getElementById('tab-create').classList.toggle('active', tab === 'create');
    document.getElementById('tab-join').classList.toggle('active', tab === 'join');
}

// ── SOCKET ─────────────────────────────────────
function initSocket(queryString) {
    const url = `ws://${BACKEND_URL}${queryString}`;
    
    console.log("Mencoba konek ke:", url);

    if (socket) socket.close();
    
    try {
        socket = new WebSocket(url);
    } catch (e) {
        console.error("Gagal buat WebSocket:", e);
        alert("Gagal konek! Pastikan 'Insecure Content' di browser sudah di-Allow.");
        return;
    }

    socket.onopen = () => console.log('Terhubung ke Server WebSocket');

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'init') {
                displayCode.innerText = data.roomId;
                userCountEl.innerText = data.userCount;
                userLimitEl.innerText = data.userLimit;
                lobby.style.display   = 'none';
                chatApp.style.display = 'flex';
                input.focus();
                return;
            }
            if (data.type === 'history') {
                appendSystem('── riwayat chat ──');
                data.data.forEach(m => appendMessage(m.username, m.message_text, 'received', m.timestamp));
                appendSystem('── sekarang ──');
                return;
            }
            if (data.type === 'message') {
                appendMessage(data.username, data.text, 'received', data.timestamp);
                clearTypingFor(data.username);
                return;
            }
            if (data.type === 'system') {
                appendSystem(data.text);
                if (data.userCount !== undefined) userCountEl.innerText = data.userCount;
                return;
            }
            if (data.type === 'typing') {
                handleTyping(data.username, data.isTyping);
                return;
            }
            if (data.error) {
                alert(data.error);
                window.location.reload();
            }
        } catch (e) { console.error(e); }
    };

    socket.onclose = () => appendSystem('── koneksi terputus ──');
    socket.onerror = () => alert('Gagal terhubung ke Lunes Host. Pastikan port 3265 terbuka.');
}

// ── CREATE / JOIN ──────────────────────────────
function createRoom() {
    const username = document.getElementById('create-username').value.trim() || 'Anonymous';
    const limit    = document.getElementById('limit-input').value || 2;
    // Panggil initSocket dengan parameter saja, karena 'ws://' dan host sudah diset di initSocket
    initSocket(`?action=create&limit=${limit}&username=${encodeURIComponent(username)}`);
}

function joinRoom() {
    const username = document.getElementById('join-username').value.trim() || 'Anonymous';
    const code     = document.getElementById('room-input').value.trim().toUpperCase();
    if (!code) return alert('Masukkan kode room!');
    initSocket(`?action=join&room=${code}&username=${encodeURIComponent(username)}`);
}

// ── SEND ───────────────────────────────────────
function handleSend() {
    const msg = input.value.trim();
    if (!msg || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ text: msg }));
    appendMessage('You', msg, 'sent', new Date().toISOString());
    input.value = '';
    sendTyping(false);
}

// ── TYPING ─────────────────────────────────────
function sendTyping(state) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (isTyping === state) return;
    isTyping = state;
    socket.send(JSON.stringify({ type: 'typing', isTyping: state }));
}

input.addEventListener('input', () => {
    sendTyping(true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => sendTyping(false), 2000);
});

function handleTyping(username, state) {
    clearTimeout(typingTimeouts[username]);
    if (state) {
        currentlyTyping.add(username);
        typingTimeouts[username] = setTimeout(() => clearTypingFor(username), 3000);
    } else {
        currentlyTyping.delete(username);
    }
    updateTypingUI();
}

function clearTypingFor(username) {
    currentlyTyping.delete(username);
    updateTypingUI();
}

function updateTypingUI() {
    if (currentlyTyping.size === 0) {
        typingText.classList.remove('visible');
    } else {
        typingText.textContent = `${[...currentlyTyping].join(', ')} sedang mengetik...`;
        typingText.classList.add('visible');
    }
}

// ── RENDER ─────────────────────────────────────
function appendMessage(sender, text, type, timestamp) {
    const wrap = document.createElement('div');
    wrap.classList.add('message-wrapper', type);
    wrap.innerHTML = `
        <div class="sender-label">${escapeHtml(sender)}</div>
        <div class="bubble">${escapeHtml(text)}</div>
        <div class="timestamp">${formatTime(timestamp)}</div>
    `;
    chatDiv.appendChild(wrap);
    scrollBottom();
}

function appendSystem(text) {
    const wrap = document.createElement('div');
    wrap.classList.add('message-wrapper', 'system');
    wrap.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    chatDiv.appendChild(wrap);
    scrollBottom();
}

// ── UTILS ──────────────────────────────────────
function formatTime(iso) {
    try { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function scrollBottom() { chatDiv.scrollTop = chatDiv.scrollHeight; }

function copyRoomCode() {
    navigator.clipboard.writeText(displayCode.innerText).then(() => showToast('COPIED!'));
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

// ── EVENTS ─────────────────────────────────────
document.getElementById('send').onclick = handleSend;
input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
document.getElementById('limit-input').addEventListener('keydown', e => { if (e.key === 'Enter') createRoom(); });
document.getElementById('room-input').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
document.getElementById('create-username').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('limit-input').focus(); });
document.getElementById('join-username').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('room-input').focus(); });