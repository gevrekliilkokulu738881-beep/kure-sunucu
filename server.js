const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// CORS ayarlarını en esnek hale getirdik
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Her yerden bağlantıya izin ver
    methods: ["GET", "POST"]
  }
});

let masalar = {};

io.on('connection', (socket) => {
    console.log("Yeni bir oyuncu bağlandı:", socket.id);
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        masalar[socket.id] = { id: socket.id, isim: data.isim, durum: 'bekliyor' };
        io.emit('liste_guncelle', masalar);
    });

    socket.on('masaya_otur', (masaId) => {
        if (masalar[masaId]) {
            masalar[masaId].durum = 'dolu';
            socket.join(masaId);
            io.emit('liste_guncelle', masalar);
            io.to(masaId).emit('oyun_basla', { rakip: masalar[masaId].isim });
        }
    });

    socket.on('hamle_yap', (data) => {
        socket.to(data.oda).emit('hamle_geldi', data.yeniTahta);
    });

    socket.on('disconnect', () => {
        delete masalar[socket.id];
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
