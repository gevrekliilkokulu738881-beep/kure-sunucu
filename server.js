const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] } 
});

app.use(express.static(path.join(__dirname, 'public')));

let activeRooms = {};

io.on('connection', (socket) => {
    socket.emit('roomList', activeRooms);

    socket.on('createRoom', (data) => {
        if (activeRooms[data.roomName]) {
            socket.emit('errorMsg', 'Bu isimde bir masa var!');
        } else {
            activeRooms[data.roomName] = {
                name: data.roomName,
                password: data.password || null,
                count: 0,
                isLocked: !!data.password
            };
            io.emit('roomList', activeRooms);
            socket.emit('roomCreated', data.roomName);
        }
    });

    socket.on('joinGame', (data) => {
        const room = activeRooms[data.roomName];
        if (room && room.count < 2) {
            if (room.isLocked && room.password !== data.password) {
                socket.emit('errorMsg', 'Şifre yanlış!');
                return;
            }
            socket.join(data.roomName);
            room.count++;
            const role = room.count === 1 ? 'mor' : 'turuncu';
            socket.emit('playerRole', { role, roomName: data.roomName });
            io.emit('roomList', activeRooms);
            if (room.count === 2) io.to(data.roomName).emit('gameReady');
        } else {
            socket.emit('errorMsg', 'Masa dolu veya bulunamadı!');
        }
    });

    socket.on('move', (data) => {
        socket.to(data.roomID).emit('opponentMove', data);
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(r => {
            if (activeRooms[r]) {
                activeRooms[r].count--;
                if (activeRooms[r].count <= 0) delete activeRooms[r];
                io.emit('roomList', activeRooms);
            }
        });
    });
});

server.listen(process.env.PORT || 3000, '0.0.0.0');
