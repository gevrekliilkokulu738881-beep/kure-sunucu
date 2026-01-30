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

    socket.on('createRoom', (data) => {
        const { roomName, password } = data;
        if (rooms[roomName]) return socket.emit('errorMsg', 'Bu isimde bir masa var!');
        rooms[roomName] = {
            password: password || "",
            hasPass: !!password,
            players: {}, 
            ready: { mor: false, turuncu: false }
        };
        socket.emit('roomCreated', roomName);
        io.emit('roomList', getPublicRooms());
    });

    socket.on('joinGame', (data) => {
        const { roomName, password } = data;
        const room = rooms[roomName];
        if (!room) return socket.emit('errorMsg', 'Masa bulunamadı!');
        if (Object.keys(room.players).length >= 2) return socket.emit('errorMsg', 'Masa dolu!');
        if (room.hasPass && room.password !== password) return socket.emit('errorMsg', 'Hatalı şifre!');

        // Rol ataması
        const role = Object.keys(room.players).length === 0 ? 'mor' : 'turuncu';
        room.players[socket.id] = role;
        socket.role = role;
        socket.room = roomName;

        socket.join(roomName);
        socket.emit('playerRole', { role: role, roomName: roomName });
        io.emit('roomList', getPublicRooms());
    });

    // HAZIR SİSTEMİ - %100 SENKRONİZE
    socket.on('playerReady', (data) => {
        const room = rooms[data.roomID];
        if (room && socket.role) {
            // Sunucu tarafında o role ait hazır bilgisini güncelle
            room.ready[socket.role] = data.ready;

            console.log(`Oda: ${data.roomID} | Mor: ${room.ready.mor} | Turuncu: ${room.ready.turuncu}`);

            // Her iki tarafa da ODANIN son hazır durumunu gönder
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
        list[name] = { players: Object.keys(rooms[name].players).length, hasPass: rooms[name].hasPass };
    }
    return list;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} aktif.`));
