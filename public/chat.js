const chatApp = document.getElementById('chat-app');
const lobby = document.getElementById('lobby');
const chatDiv = document.getElementById('chat');
const input = document.getElementById('message');
const displayCode = document.getElementById('display-code');

let socket = null;

function showTab(tab) {
    document.getElementById('create-tab').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('join-tab').style.display = tab === 'join' ? 'block' : 'none';
    
    const buttons = document.querySelectorAll('.tab-buttons button');
    buttons[0].classList.toggle('active', tab === 'create');
    buttons[1].classList.toggle('active', tab === 'join');
}

function initSocket(url) {
    if (socket) {
        socket.close();
    }

    socket = new WebSocket(url);

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'init') {
                displayCode.innerText = data.roomId;
                lobby.style.display = 'none';
                chatApp.style.display = 'flex';
                return;
            }

            if (data.type === 'history') {
                data.data.forEach(chat => {
                    appendMessage('User', chat.message_text, 'received');
                });
                return;
            }

            if (data.error) {
                alert(data.error);
                window.location.reload();
                return;
            }

            if (data.text) {
                appendMessage('User', data.text, 'received');
            }
        } catch (e) {
            appendMessage('User', event.data, 'received');
        }
    };

    socket.onclose = () => {
        console.log("Koneksi terputus.");
    };
}

function createRoom() {
    const limit = document.getElementById('limit-input').value;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    initSocket(`${protocol}://${window.location.host}?action=create&limit=${limit}`);
}

function joinRoom() {
    const code = document.getElementById('room-input').value.trim().toUpperCase();
    if (!code) return alert("Masukkan kode!");
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    initSocket(`${protocol}://${window.location.host}?action=join&room=${code}`);
}

function appendMessage(senderName, text, type) {
    const msgWrapper = document.createElement('div');
    msgWrapper.classList.add('message-wrapper', type);
    msgWrapper.innerHTML = `
        <div class="sender-label">${senderName}</div>
        <div class="bubble">${text}</div>
    `;
    chatDiv.appendChild(msgWrapper);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function handleSend() {
    const msg = input.value;
    if (msg.trim() !== "" && socket) {
        socket.send(JSON.stringify({ text: msg }));
        appendMessage('You', msg, 'sent');
        input.value = '';
    }
}

document.getElementById('send').onclick = handleSend;
input.onkeydown = (e) => { if(e.key === 'Enter') handleSend(); };