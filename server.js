const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let rooms = {}; 

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    // Mevcut odaları gönder
    socket.emit('roomList', getPublicRooms());

    // ODA KURMA
    socket.on('createRoom', (data) => {
        const { roomName, password } = data;
        if (rooms[roomName]) {
            socket.emit('errorMsg', 'Bu isimde bir masa zaten var!');
            return;
        }
        rooms[roomName] = {
            password: password || "",
            hasPass: password ? true : false,
            players: {}, // socket.id -> role
            readyStatus: { mor: false, turuncu: false }
        };
        socket.emit('roomCreated', roomName);
        io.emit('roomList', getPublicRooms());
    });

    // ODAYA KATILMA
    socket.on('joinGame', (data) => {
        const { roomName, password } = data;
        const room = rooms[roomName];

        if (!room) return socket.emit('errorMsg', 'Masa bulunamadı!');
        if (Object.keys(room.players).length >= 2) return socket.emit('errorMsg', 'Masa dolu!');
        if (room.hasPass && room.password !== password) return socket.emit('errorMsg', 'Hatalı şifre!');

        // Rol atama (İlk gelen Mor, ikinci gelen Turuncu)
        const role = Object.keys(room.players).length === 0 ? 'mor' : 'turuncu';
        room.players[socket.id] = role;
        socket.role = role; 
        socket.room = roomName;

        socket.join(roomName);
        socket.emit('playerRole', { role: role, roomName: roomName });

        if (Object.keys(room.players).length === 2) {
            io.to(roomName).emit('gameReady');
        }

        io.emit('roomList', getPublicRooms());
    });

    // HAZIR DURUMU (KRİTİK KISIM)
    socket.on('playerReady', (data) => {
        const { roomID, ready } = data;
        const room = rooms[roomID];
        
        if (room && socket.role) {
            // socket.role 'mor' veya 'turuncu' olarak kayıtlıdır
            if (socket.role === 'mor') room.readyStatus.mor = ready;
            if (socket.role === 'turuncu') room.readyStatus.turuncu = ready;

            console.log(`${roomID} odasında hazır durumu:`, room.readyStatus);

            // Odaya her iki oyuncunun da güncel hazır bilgisini gönder
            io.to(roomID).emit('updateReadyStatus', {
                morReady: room.readyStatus.mor,
                turuncuReady: room.readyStatus.turuncu
            });
        }
    });

    // HAMLE İLETME
    socket.on('move', (data) => {
        // Hamleyi yapan hariç odadaki diğer kişiye gönder
        socket.to(data.roomID).emit('opponentMove', data);
    });

    // AYRILMA
    socket.on('disconnect', () => {
        if (socket.room && rooms[socket.room]) {
            delete rooms[socket.room].players[socket.id];
            if (Object.keys(rooms[socket.room].players).length === 0) {
                delete rooms[socket.room];
                delete roomReadyStatus[socket.room];
            }
            io.emit('roomList', getPublicRooms());
        }
    });
});

function getPublicRooms() {
    let list = {};
    for (let name in rooms) {
        list[name] = {
            players: Object.keys(rooms[name].players).length,
            hasPass: rooms[name].hasPass
        };
    }
    return list;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
