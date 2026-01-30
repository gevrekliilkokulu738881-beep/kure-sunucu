const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let rooms = {};
let tournamentQueue = []; 

io.on('connection', (socket) => {
    socket.emit('roomList', getPublicRooms());

    // --- TURNUVA KATILIM ---
    socket.on('joinTournament', (playerName) => {
        // Eğer oyuncu zaten listede yoksa ekle
        if (!tournamentQueue.find(p => p.id === socket.id)) {
            tournamentQueue.push({ id: socket.id, name: playerName });
            console.log("Turnuva Kuyruğu:", tournamentQueue.length);
            io.emit('tourUpdate', tournamentQueue.length);
            
            if (tournamentQueue.length === 4) {
                const tourID = "TOUR_" + Math.floor(Math.random() * 9999);
                const p = [...tournamentQueue];
                tournamentQueue = []; // Kuyruğu sıfırla

                // Odaları sunucu tarafında oluştur
                rooms[tourID + "_M1"] = { password: "", hasPass: false, players: {}, owner: "SYSTEM", ready: { mor: false, turuncu: false } };
                rooms[tourID + "_M2"] = { password: "", hasPass: false, players: {}, owner: "SYSTEM", ready: { mor: false, turuncu: false } };

                // Oyuncuları eşleştir ve zorla yönlendir
                io.to(p[0].id).emit('startTourMatch', { room: tourID + "_M1" });
                io.to(p[1].id).emit('startTourMatch', { room: tourID + "_M1" });
                io.to(p[2].id).emit('startTourMatch', { room: tourID + "_M2" });
                io.to(p[3].id).emit('startTourMatch', { room: tourID + "_M2" });
                
                io.emit('tourUpdate', 0);
            }
        }
    });

    // --- STANDART GİRİŞ ---
    socket.on('joinGame', (data) => {
        if (!rooms[data.roomName]) return socket.emit('errorMsg', 'Masa bulunamadı!');
        const room = rooms[data.roomName];
        
        if (Object.keys(room.players).length >= 2) return socket.emit('errorMsg', 'Masa dolu!');
        
        const role = Object.keys(room.players).length === 0 ? 'mor' : 'turuncu';
        room.players[socket.id] = { role, name: data.playerName };
        socket.role = role;
        socket.room = data.roomName;
        
        socket.join(data.roomName);
        socket.emit('playerRole', { role, roomName: data.roomName });
    });

    // --- SOHBET ---
    socket.on('chatMsg', (data) => {
        io.to(data.roomID).emit('newChat', { user: data.user, msg: data.msg, type: data.type });
    });

    // ... (createRoom, playerReady, move ve disconnect kodları öncekiyle aynı kalsın)
    socket.on('createRoom', (data) => {
        const { roomName, password } = data;
        if (rooms[roomName]) return socket.emit('errorMsg', 'Bu isimde masa var!');
        rooms[roomName] = { password: password || "", hasPass: !!password, players: {}, owner: socket.id, ready: { mor: false, turuncu: false }};
        socket.emit('roomCreated', roomName);
        io.emit('roomList', getPublicRooms());
    });
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
