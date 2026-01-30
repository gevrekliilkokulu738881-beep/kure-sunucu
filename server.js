const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let rooms = {};
let tournamentQueue = []; // Turnuva bekleyenler

io.on('connection', (socket) => {
    socket.emit('roomList', getPublicRooms());

    // --- STANDART MASA KURMA ---
    socket.on('createRoom', (data) => {
        const { roomName, password } = data;
        if (rooms[roomName]) return socket.emit('errorMsg', 'Bu masa adı alınmış!');
        rooms[roomName] = {
            password: password || "",
            hasPass: !!password,
            players: {}, 
            owner: socket.id, // İlk giren admin olur
            ready: { mor: false, turuncu: false }
        };
        socket.emit('roomCreated', roomName);
        io.emit('roomList', getPublicRooms());
    });

    socket.on('joinGame', (data) => {
        const room = rooms[data.roomName];
        if (!room) return socket.emit('errorMsg', 'Masa bulunamadı!');
        if (Object.keys(room.players).length >= 2) return socket.emit('errorMsg', 'Masa dolu!');
        if (room.hasPass && room.password !== data.password) return socket.emit('errorMsg', 'Şifre yanlış!');

        const role = Object.keys(room.players).length === 0 ? 'mor' : 'turuncu';
        room.players[socket.id] = { role, name: data.playerName || role };
        socket.role = role;
        socket.room = data.roomName;
        socket.join(data.roomName);
        socket.emit('playerRole', { role, roomName: data.roomName });
    });

    // --- TURNUVA SİSTEMİ (4 KİŞİLİK) ---
    socket.on('joinTournament', (playerName) => {
        if (!tournamentQueue.find(p => p.id === socket.id)) {
            tournamentQueue.push({ id: socket.id, name: playerName });
            io.emit('tourUpdate', tournamentQueue.length);
            
            if (tournamentQueue.length === 4) {
                const tourID = "TOUR_" + Date.now();
                const players = [...tournamentQueue];
                tournamentQueue = [];
                // 1. Maç: Oyuncu 0 vs 1 | 2. Maç: Oyuncu 2 vs 3
                io.to(players[0].id).to(players[1].id).emit('startTourMatch', { room: tourID + "_M1", opponent: "Yarı Final" });
                io.to(players[2].id).to(players[3].id).emit('startTourMatch', { room: tourID + "_M2", opponent: "Yarı Final" });
            }
        }
    });

    // --- SOHBET VE BAN ---
    socket.on('chatMsg', (data) => {
        const badWords = ["küfür1", "küfür2"]; // Buraya engelenecek kelimeleri ekle
        let cleanMsg = data.msg;
        badWords.forEach(w => cleanMsg = cleanMsg.replace(new RegExp(w, 'gi'), '***'));
        io.to(data.roomID).emit('newChat', { user: data.user, msg: cleanMsg, type: data.type });
    });

    socket.on('kickPlayer', (roomID) => {
        const room = rooms[roomID];
        if (room && room.owner === socket.id) {
            socket.to(roomID).emit('banned'); // Diğer oyuncuya ban gönder
        }
    });

    // Standart hazır olma ve hamle iletme... (Önceki kodlar dahil)
    socket.on('playerReady', (d) => {
        const room = rooms[d.roomID];
        if(room) {
            room.ready[socket.role] = d.ready;
            io.to(d.roomID).emit('updateReadyStatus', { morReady: room.ready.mor, turuncuReady: room.ready.turuncu });
        }
    });
    socket.on('move', (d) => socket.to(d.roomID).emit('opponentMove', d));
});

function getPublicRooms() {
    let list = {};
    for (let n in rooms) list[n] = { players: Object.keys(rooms[n].players).length, hasPass: rooms[n].hasPass };
    return list;
}
server.listen(process.env.PORT || 3000);
