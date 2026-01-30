const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'] 
});

app.use(express.static(path.join(__dirname, '.')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let masalar = {};

io.on('connection', (socket) => {
    console.log('Yeni baglanti:', socket.id);
    socket.emit('odalar', masalar);

    socket.on('oda_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { 
            id: odaId, 
            mor: data.isim || "Oyuncu 1", 
            turuncu: "", 
            durum: 'bekliyor' 
        };
        io.emit('odalar', masalar);
    });

    socket.on('oda_katil', (data) => {
        const oda = masalar[data.id];
        if (oda && oda.durum === 'bekliyor') {
            socket.join(data.id);
            oda.turuncu = data.isim || "Oyuncu 2";
            oda.durum = 'dolu';
            io.emit('odalar', masalar);
            io.to(data.id).emit('oyun_basla', oda);
        }
    });

    socket.on('hamle', (data) => {
        socket.to(data.oda).emit('rakip_hamle', data);
    });

    socket.on('disconnect', () => {
        for (let id in masalar) {
            if (id.includes(socket.id)) {
                socket.to(id).emit('ayrildi');
                delete masalar[id];
            }
        }
        io.emit('odalar', masalar);
    });
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, "0.0.0.0", () => console.log(`Sunucu aktif: ${PORT}`));
