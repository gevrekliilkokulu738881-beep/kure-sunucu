const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

let masalar = {};

io.on('connection', (socket) => {
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        masalar[socket.id] = { id: socket.id, isim: data.isim, durum: 'bekliyor' };
        io.emit('liste_guncelle', masalar);
    });

    socket.on('masaya_otur', (masaId) => {
        if (masalar[masaId]) {
            masalar[masaId].durum = 'dolu';
            io.emit('liste_guncelle', masalar);
            io.emit('oyun_basla', { oda: masaId });
        }
    });

    socket.on('hamle_yap', (data) => {
        // Gelen hamleyi istisnasız herkese gönder
        io.emit('hamle_geldi', data);
    });

    socket.on('disconnect', () => {
        if (masalar[socket.id]) delete masalar[socket.id];
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu aktif.`));
