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

    socket.on('createRoom', (data) => {
        const { roomName, password, playerName } = data;
        if (rooms[roomName]) return socket.emit('errorMsg', 'Bu masa adı dolu!');
        rooms[roomName] = {
            password: password || "",
            hasPass: !!password,
            players: {}, 
            owner: socket.id,
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
        room.players[socket.id] = { role, name: data.playerName };
        socket.role = role;
        socket.room = data.roomName;
        socket.playerName = data.playerName;
        socket.join(data.roomName);
        socket.emit('playerRole', { role, roomName: data.roomName, playerName: data.playerName });
    });

    socket.on('joinTournament', (playerName) => {
        if (!tournamentQueue.find(p => p.id === socket.id)) {
            tournamentQueue.push({ id: socket.id, name: playerName });
            io.emit('tourUpdate', tournamentQueue.length);
            
            if (tournamentQueue.length === 4) {
                const tourID = "TOUR_" + Math.floor(Math.random() * 1000);
                const p = [...tournamentQueue];
                tournamentQueue = [];
                // Eşleşmeleri yap ve gönder
                io.to(p[0].id).emit('startTourMatch', { room: tourID+"_M1", opp: p[1].name });
                io.to(p[1].id).emit('startTourMatch', { room: tourID+"_M1", opp: p[0].name });
                io.to(p[2].id).emit('startTourMatch', { room: tourID+"_M2", opp: p[3].name });
                io.to(p[3].id).emit('startTourMatch', { room: tourID+"_M2", opp: p[2].name });
                io.emit('tourUpdate', 0);
            }
        }
    });

    socket.on('chatMsg', (data) => {
        const badWords = ["küfür1", "küfür2"]; 
        let cleanMsg = data.msg;
        badWords.forEach(w => cleanMsg = cleanMsg.replace(new RegExp(w, 'gi'), '***'));
        io.to(data.roomID).emit('newChat', { user: data.user, msg: cleanMsg });
    });

    socket.on('kickPlayer', (roomID) => {
        if (rooms[roomID] && rooms[roomID].owner === socket.id) {
            socket.to(roomID).emit('banned');
        }
    });

    socket.on('playerReady', (d) => {
        const room = rooms[d.roomID];
        if(room) {
            room.ready[socket.role] = d.ready;
            io.to(d.roomID).emit('updateReadyStatus', { morReady: room.ready.mor, turuncuReady: room.ready.turuncu });
        }
    });

    socket.on('move', (d) => socket.to(d.roomID).emit('opponentMove', d));

    socket.on('disconnect', () => {
        tournamentQueue = tournamentQueue.filter(p => p.id !== socket.id);
        io.emit('tourUpdate', tournamentQueue.length);
    });
});

function getPublicRooms() {
    let list = {};
    for (let n in rooms) list[n] = { players: Object.keys(rooms[n].players).length, hasPass: rooms[n].hasPass };
    return list;
}
server.listen(process.env.PORT || 3000);
