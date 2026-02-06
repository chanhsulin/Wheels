const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const os = require('os');

// Simple in-memory game store per room
const games = new Map();

const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7'];

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function createGame(room) {
  return {
    room,
    players: new Map(), // socketId -> state
    started: false,
  };
}

function publicRoomState(game) {
  const players = [];
  for (const [id, p] of game.players) {
    players.push({ id, name: p.name, spinsLeft: p.spinsLeft, ready: !!p.ready });
  }
  return { room: game.room, players };
}

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  socket.on('join', ({ room, name }) => {
    const playerName = name || 'Anonymous';

    // Ensure a game object exists
    if (!games.has(room)) games.set(room, createGame(room));
    const game = games.get(room);

    // Enforce max 2 players per room
    if (game.players.size >= 2) {
      socket.emit('room_full');
      return;
    }

    socket.join(room);
    socket.data.name = playerName;

    // Initialize player state
    const pstate = {
      id: socket.id,
      name: playerName,
      slots: Array(5).fill(null),
      locks: Array(5).fill(false),
      spinsLeft: 3,
      ready: false,
    };
    game.players.set(socket.id, pstate);

    io.to(room).emit('system', `${playerName} joined the room`);
    io.to(room).emit('game_state', publicRoomState(game));

    // If room now has exactly 2 players, start the match
    if (game.players.size === 2 && !game.started) {
      game.started = true;
      // notify players that game started
      io.to(room).emit('game_started', { msg: 'Game starting — each player has 3 spins' });
      // send each player their initial private view (empty slots)
      for (const [id, p] of game.players) {
        const sock = io.sockets.sockets.get(id);
        if (sock) sock.emit('spin_result', { slots: p.slots, spinsLeft: p.spinsLeft });
      }
    }
  });

  socket.on('message', ({ room, text }) => {
    const name = socket.data.name || 'Anonymous';
    io.to(room).emit('message', { name, text, ts: Date.now() });
  });

  // Player requests a spin: server randomizes unlocked slots for that player
  socket.on('spin', ({ room }) => {
    const game = games.get(room);
    if (!game) return;
    const player = game.players.get(socket.id);
    if (!player) return;
    if (player.spinsLeft <= 0) return;

    // randomize unlocked slots
    for (let i = 0; i < player.slots.length; i++) {
      if (!player.locks[i]) player.slots[i] = randomSymbol();
    }
    player.spinsLeft -= 1;

    // send private spin result to player
    socket.emit('spin_result', { slots: player.slots, spinsLeft: player.spinsLeft });

    // broadcast public game state to room (without revealing slot details)
    io.to(room).emit('game_state', publicRoomState(game));
  });

  // Player updates locks
  socket.on('update_locks', ({ room, locks }) => {
    const game = games.get(room);
    if (!game) return;
    const player = game.players.get(socket.id);
    if (!player) return;
    // validate locks length
    if (!Array.isArray(locks) || locks.length !== player.locks.length) return;
    player.locks = locks.map(Boolean);
    // broadcast public state so opponents see spinsLeft / ready
    io.to(room).emit('game_state', publicRoomState(game));
  });

  // Player marks finished (after using all spins)
  socket.on('finish', ({ room }) => {
    const game = games.get(room);
    if (!game) return;
    const player = game.players.get(socket.id);
    if (!player) return;
    player.ready = true;
    io.to(room).emit('game_state', publicRoomState(game));

    // If all players ready, reveal both players' slots
    const allReady = Array.from(game.players.values()).every((p) => p.ready === true);
    if (allReady) {
      const reveal = [];
      for (const [id, p] of game.players) {
        reveal.push({ id, name: p.name, slots: p.slots });
      }
      io.to(room).emit('reveal', { players: reveal });
    }
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((room) => {
      socket.to(room).emit('system', `${socket.data.name || 'Someone'} left the room`);

      const roomSet = io.sockets.adapter.rooms.get(room) || new Set();
      const participants = Array.from(roomSet).map((id) => {
        const s = io.sockets.sockets.get(id);
        return s && s.data && s.data.name ? s.data.name : 'Anonymous';
      });

      io.to(room).emit('participants', participants);
    });
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected:', socket.id);
  });
});

const os = require('os');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);

  // Print local network IPv4 addresses to make it easy to connect from other devices
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }

  if (addresses.length) {
    console.log('Local network addresses (use one of these from other devices):');
    addresses.forEach((a) => console.log(`  ${a.interface}: http://${a.address}:${PORT}`));
  } else {
    console.log('No non-internal IPv4 addresses detected. If you need remote access, check your network settings.');
  }
});
