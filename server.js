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

    // --- TURNUVA SİSTEMİ ---
    socket.on('joinTournament', (playerName) => {
        if (!tournamentQueue.find(p => p.id === socket.id)) {
            tournamentQueue.push({ id: socket.id, name: playerName });
            io.emit('tourUpdate', tournamentQueue.length);
            
            if (tournamentQueue.length >= 4) {
                const tourID = "T_" + Date.now();
                const players = tournamentQueue.splice(0, 4);

                // Eşleşmeleri isimlerle birlikte gönder
                // Maç 1: Oyuncu 0 vs Oyuncu 1
                io.to(players[0].id).emit('startTourMatch', { room: tourID + "_M1", opponent: players[1].name });
                io.to(players[1].id).emit('startTourMatch', { room: tourID + "_M1", opponent: players[0].name });
                
                // Maç 2: Oyuncu 2 vs Oyuncu 3
                io.to(players[2].id).emit('startTourMatch', { room: tourID + "_M2", opponent: players[3].name });
                io.to(players[3].id).emit('startTourMatch', { room: tourID + "_M2", opponent: players[2].name });
                
                io.emit('tourUpdate', tournamentQueue.length);
            }
        }
    });

    socket.on('joinGame', (data) => {
        if(!rooms[data.roomName]) {
            rooms[data.roomName] = { players: {}, owner: socket.id, ready: { mor: false, turuncu: false } };
        }
        const room = rooms[data.roomName];
        if (Object.keys(room.players).length >= 2) return socket.emit('errorMsg', 'Masa dolu!');

        const role = Object.keys(room.players).length === 0 ? 'mor' : 'turuncu';
        room.players[socket.id] = { role: role, name: data.playerName };
        socket.role = role;
        socket.room = data.roomName;
        socket.playerName = data.playerName;
        
        socket.join(data.roomName);
        
        // Odadaki diğer oyuncunun ismini bul
        let oppName = "Bekleniyor...";
        Object.values(room.players).forEach(p => {
            if(p.role !== role) oppName = p.name;
        });

        socket.emit('playerRole', { role: role, roomName: data.roomName, myName: data.playerName, oppName: oppName });
        socket.to(data.roomName).emit('updateOpponentName', { oppName: data.playerName });
    });

    socket.on('chatMsg', (d) => {
        io.to(d.roomID).emit('newChat', { user: d.user, msg: d.msg, type: d.type });
    });

    socket.on('playerReady', (d) => {
        if(rooms[d.roomID]) {
            rooms[d.roomID].ready[socket.role] = d.ready;
            io.to(d.roomID).emit('updateReadyStatus', rooms[d.roomID].ready);
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
    for (let n in rooms) list[n] = { players: Object.keys(rooms[n].players).length };
    return list;
}
server.listen(process.env.PORT || 3000);
