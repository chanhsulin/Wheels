const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  socket.on('join', ({ room, name }) => {
    socket.join(room);
    socket.data.name = name || 'Anonymous';
    console.log(`${socket.data.name} joined room ${room}`);

    // build participants list
    const roomSet = io.sockets.adapter.rooms.get(room) || new Set();
    const participants = Array.from(roomSet).map((id) => {
      const s = io.sockets.sockets.get(id);
      return s && s.data && s.data.name ? s.data.name : 'Anonymous';
    });

    io.to(room).emit('system', `${socket.data.name} joined the room`);
    io.to(room).emit('participants', participants);
  });

  socket.on('message', ({ room, text }) => {
    const name = socket.data.name || 'Anonymous';
    io.to(room).emit('message', { name, text, ts: Date.now() });
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
