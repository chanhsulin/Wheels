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
  const slotsEl = document.getElementById('slots');
  const spinBtn = document.getElementById('spin-btn');
  const spinsLeftEl = document.getElementById('spins-left');
  const resetLocksBtn = document.getElementById('reset-locks');
  const statusEl = document.getElementById('status');

  const SYMBOLS = ['🍒','🔔','🍋','⭐','7'];

  let currentRoom = null;
  let mySlots = [null,null,null,null,null];
  let myLocks = [false,false,false,false,false];
  let mySpinsLeft = 3;
  let gameStarted = false;
  let revealed = false;

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
    currentRoom = room;
    renderSlots();
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

  socket.on('game_state', (state) => {
    // update participants list from game_state
    participantsList.innerHTML = '';
    state.players.forEach((p) => {
      const li = document.createElement('li');
      li.textContent = `${p.name} ${p.ready ? '(ready)' : ''} - spins: ${p.spinsLeft}`;
      participantsList.appendChild(li);
    });
  });

  socket.on('game_started', ({ msg }) => {
    gameStarted = true;
    statusEl.textContent = msg;
  });

  // receive our private spin result
  socket.on('spin_result', ({ slots, spinsLeft }) => {
    mySlots = slots.slice();
    mySpinsLeft = spinsLeft;
    spinsLeftEl.textContent = mySpinsLeft;
    renderSlots();
    statusEl.textContent = mySpinsLeft > 0 ? 'Choose locks then spin again' : 'No spins left — waiting for opponent';
    if (mySpinsLeft === 0) {
      // auto-finish
      socket.emit('finish', { room: currentRoom });
    }
  });

  socket.on('reveal', ({ players }) => {
    // show both players final slots
    revealed = true;
    // find opponent and show in messages
    players.forEach((p) => {
      if (p.id === socket.id) return; // skip our own (we already render ours)
      const el = document.createElement('div');
      el.className = 'system';
      el.textContent = `${p.name} final: ${p.slots.join(' ')}`;
      messages.appendChild(el);
    });
    statusEl.textContent = 'Reveal complete';
  });

  msgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;
    const room = roomLabel.textContent;
    socket.emit('message', { room, text });
    msgInput.value = '';
  });

  // Slot rendering and interaction
  function renderSlots() {
    slotsEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('div');
      s.className = 'slot' + (myLocks[i] ? ' locked' : '');
      s.dataset.index = i;
      s.textContent = mySlots[i] || '—';

      const lb = document.createElement('button');
      lb.className = 'lock-btn';
      lb.textContent = myLocks[i] ? 'Locked' : 'Lock';
      lb.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (mySpinsLeft === 0) return; // cannot change after spins done
        myLocks[i] = !myLocks[i];
        socket.emit('update_locks', { room: currentRoom, locks: myLocks });
        renderSlots();
      });

      s.appendChild(lb);
      slotsEl.appendChild(s);
    }
  }

  spinBtn.addEventListener('click', () => {
    if (!currentRoom) return;
    if (mySpinsLeft <= 0) return;
    socket.emit('spin', { room: currentRoom });
  });

  resetLocksBtn.addEventListener('click', () => {
    myLocks = [false,false,false,false,false];
    socket.emit('update_locks', { room: currentRoom, locks: myLocks });
    renderSlots();
  });

  // simple escaping
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
