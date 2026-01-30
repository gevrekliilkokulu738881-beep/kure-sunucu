const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    socket.emit('updateRooms', rooms);

    socket.on('createRoom', (data) => {
        const roomId = "room_" + socket.id;
        socket.join(roomId);
        rooms[roomId] = { 
            id: roomId, 
            p1: { id: socket.id, name: data.name, color: 'mor' },
            p2: null,
            status: 'waiting'
        };
        io.emit('updateRooms', rooms);
        socket.emit('waitingPlayer');
    });

    socket.on('joinRoom', (data) => {
        const room = rooms[data.id];
        if (room && room.status === 'waiting') {
            socket.join(data.id);
            room.p2 = { id: socket.id, name: data.name, color: 'turuncu' };
            room.status = 'playing';
            io.emit('updateRooms', rooms);
            io.to(data.id).emit('gameStart', room);
        }
    });

    socket.on('makeMove', (data) => {
        socket.to(data.roomId).emit('opponentMove', data);
    });

    socket.on('disconnect', () => {
        for (let id in rooms) {
            if (rooms[id].p1.id === socket.id || (rooms[id].p2 && rooms[id].p2.id === socket.id)) {
                socket.to(id).emit('playerLeft');
                delete rooms[id];
            }
        }
        io.emit('updateRooms', rooms);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log("Sunucu Hazir"));
