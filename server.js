const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Tüm bağlantılara izin ver
        methods: ["GET", "POST"]
    }
});

// Statik dosyaları (HTML, CSS, JS) 'public' klasöründen sun
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Bağlantı başarılı: ' + socket.id);

    // Oyuncu bir masaya katılmak istediğinde
    socket.on('joinGame', (roomID) => {
        const room = io.sockets.adapter.rooms.get(roomID);
        const numClients = room ? room.size : 0;

        if (numClients < 2) {
            socket.join(roomID);
            // İlk gelen mor, ikinci gelen turuncu olur
            const role = numClients === 0 ? 'mor' : 'turuncu';
            socket.emit('playerRole', role);
            
            console.log(`ID: ${socket.id} | Masa: ${roomID} | Rol: ${role}`);
            
            // Eğer masa dolduysa oyunu başlatması için her iki tarafa haber ver
            if (numClients === 1) {
                io.to(roomID).emit('gameReady', "Oyun Başlıyor!");
            }
        } else {
            socket.emit('errorMsg', 'Bu masa maalesef dolu!');
        }
    });

    // Bir oyuncu hamle yaptığında diğerine ilet
    socket.on('move', (data) => {
        // data şunları içermeli: { roomID, from, to, role }
        socket.to(data.roomID).emit('opponentMove', data);
    });

    socket.on('disconnect', () => {
        console.log('Oyuncu ayrıldı: ' + socket.id);
    });
});

// Render ve diğer platformlar için port ayarı
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu ${PORT} portunda canavar gibi çalışıyor...`);
});
