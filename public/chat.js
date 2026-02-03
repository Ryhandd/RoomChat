const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const socket = new WebSocket(`${protocol}://${window.location.host}${window.location.search}`);
const chatDiv = document.getElementById('chat');
const input = document.getElementById('message');
const sendBtn = document.getElementById('send');

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
    if (msg.trim() !== "") {
        socket.send(msg);
        appendMessage('You', msg, 'sent');
        input.value = '';
    }
}

sendBtn.onclick = handleSend;

input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); 
        handleSend();
    }
});

socket.onmessage = (event) => {
    appendMessage('User', event.data, 'received');
};