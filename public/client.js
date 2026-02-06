(function () {
  const socket = io();
  const joinSection = document.getElementById('join-section');
  const appSection = document.getElementById('app');
  const joinBtn = document.getElementById('join');
  const genBtn = document.getElementById('gen');
  const nameInput = document.getElementById('name');
  const roomInput = document.getElementById('room');
  const roomLabel = document.getElementById('room-label');
  const participantsList = document.getElementById('participants-list');
  const messages = document.getElementById('messages');
  const msgForm = document.getElementById('msg-form');
  const msgInput = document.getElementById('msg-input');

  function makeCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  genBtn.addEventListener('click', () => {
    roomInput.value = makeCode();
  });

  joinBtn.addEventListener('click', () => {
    const room = roomInput.value.trim();
    const name = nameInput.value.trim() || 'Anonymous';
    if (!room) return alert('Please enter a room code or generate one.');

    socket.emit('join', { room, name });
    roomLabel.textContent = room;
    joinSection.classList.add('hidden');
    appSection.classList.remove('hidden');
  });

  socket.on('system', (text) => {
    const el = document.createElement('div');
    el.className = 'system';
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on('message', ({ name, text, ts }) => {
    const el = document.createElement('div');
    el.className = 'message';
    const time = new Date(ts).toLocaleTimeString();
    el.innerHTML = `<b>${escapeHtml(name)}</b> <span class="time">${time}</span><div>${escapeHtml(text)}</div>`;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on('participants', (participants) => {
    participantsList.innerHTML = '';
    participants.forEach((p) => {
      const li = document.createElement('li');
      li.textContent = p;
      participantsList.appendChild(li);
    });
  });

  msgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;
    const room = roomLabel.textContent;
    socket.emit('message', { room, text });
    msgInput.value = '';
  });

  // simple escaping
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
