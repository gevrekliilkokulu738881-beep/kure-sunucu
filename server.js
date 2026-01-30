const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// Aktif odaların bilgisini tutan obje
const activeRooms = {}; 

io.on('connection', (socket) => {
    // Bağlanan kişiye mevcut odaları gönder
    socket.emit('roomList', activeRooms);

    socket.on('createRoom', (data) => {
        const { roomName, password } = data;
        if (activeRooms[roomName]) {
            socket.emit('errorMsg', 'Bu isimde bir masa zaten var!');
            return;
        }

        activeRooms[roomName] = {
            name: roomName,
            password: password || null,
            count: 0,
            isLocked: !!password
        };

        io.emit('roomList', activeRooms); // Lobiyi güncelle
        socket.emit('roomCreated', roomName);
    });

    socket.on('joinGame', (data) => {
        const { roomName, password } = data;
        const room = activeRooms[roomName];

        if (!room) {
            socket.emit('errorMsg', 'Masa bulunamadı!');
            return;
        }
        if (room.count >= 2) {
            socket.emit('errorMsg', 'Masa dolu!');
            return;
        }
        if (room.isLocked && room.password !== password) {
            socket.emit('errorMsg', 'Hatalı şifre!');
            return;
        }

        socket.join(roomName);
        room.count++;
        const role = (room.count === 1) ? 'mor' : 'turuncu';
        
        socket.emit('playerRole', role);
        io.emit('roomList', activeRooms); // Sayıyı güncelle

        if (room.count === 2) {
            io.to(roomName).emit('gameReady', "Oyun Başladı!");
        }
    });

    socket.on('move', (data) => {
        socket.to(data.roomID).emit('opponentMove', data);
    });

    socket.on('disconnecting', () => {
        for (const roomName of socket.rooms) {
            if (activeRooms[roomName]) {
                activeRooms[roomName].count--;
                if (activeRooms[roomName].count <= 0) {
                    delete activeRooms[roomName];
                }
                io.emit('roomList', activeRooms);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Sunucu aktif.`));
