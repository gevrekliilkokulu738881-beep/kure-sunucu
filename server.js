const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let rooms = {};

io.on('connection', (socket) => {
    socket.emit('roomList', getPublicRooms());

    // ŞİFRELİ MASA KURMA
    socket.on('createRoom', (data) => {
        const { roomName, password } = data;
        if (rooms[roomName]) return socket.emit('errorMsg', 'Bu isimde bir masa var!');
        
        rooms[roomName] = {
            password: password || "", // Şifre varsa sakla, yoksa boş bırak
            hasPass: !!password,      // Şifre var mı yok mu?
            players: {}, 
            ready: { mor: false, turuncu: false }
        };
        
        socket.emit('roomCreated', roomName);
        io.emit('roomList', getPublicRooms());
    });

    // ŞİFRE KONTROLLÜ GİRİŞ
    socket.on('joinGame', (data) => {
        const { roomName, password } = data;
        const room = rooms[roomName];

        if (!room) return socket.emit('errorMsg', 'Masa bulunamadı!');
        if (Object.keys(room.players).length >= 2) return socket.emit('errorMsg', 'Masa dolu!');
        
        // Şifre kontrolü
        if (room.hasPass && room.password !== password) {
            return socket.emit('errorMsg', 'Hatalı şifre! Lütfen tekrar deneyin.');
        }

        const role = Object.keys(room.players).length === 0 ? 'mor' : 'turuncu';
        room.players[socket.id] = role;
        socket.role = role;
        socket.room = roomName;

        socket.join(roomName);
        socket.emit('playerRole', { role: role, roomName: roomName });
        io.emit('roomList', getPublicRooms());
    });

    socket.on('playerReady', (data) => {
        const room = rooms[data.roomID];
        if (room && socket.role) {
            room.ready[socket.role] = data.ready;
            io.to(data.roomID).emit('updateReadyStatus', {
                morReady: room.ready.mor,
                turuncuReady: room.ready.turuncu
            });
        }
    });

    socket.on('move', (data) => {
        socket.to(data.roomID).emit('opponentMove', data);
    });

    socket.on('disconnect', () => {
        if (socket.room && rooms[socket.room]) {
            delete rooms[socket.room].players[socket.id];
            if (Object.keys(rooms[socket.room].players).length === 0) delete rooms[socket.room];
            io.emit('roomList', getPublicRooms());
        }
    });
});

function getPublicRooms() {
    let list = {};
    for (let name in rooms) {
        list[name] = { 
            players: Object.keys(rooms[name].players).length, 
            hasPass: rooms[name].hasPass // İstemciye kilit ikonu göstermesi için bilgi ver
        };
    }
    return list;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} aktif.`));
