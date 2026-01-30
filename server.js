const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

let masalar = {};
let banListesi = new Set();

io.on('connection', (socket) => {
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        masalar[socket.id] = { id: socket.id, isim: data.isim, durum: 'bekliyor' };
        socket.join(socket.id); // Kurucu odaya girer
        io.emit('liste_guncelle', masalar);
    });

    socket.on('masaya_otur', (masaId) => {
        if (masalar[masaId]) {
            masalar[masaId].durum = 'dolu';
            socket.join(masaId); // Katılan odaya girer
            io.emit('liste_guncelle', masalar);
            io.to(masaId).emit('oyun_basla', { oda: masaId });
        }
    });

    socket.on('hamle_yap', (data) => {
        if (data.oda) {
            socket.to(data.oda).emit('hamle_geldi', data);
        }
    });

    socket.on('mesaj_gonder', (data) => {
        if (!banListesi.has(socket.id)) {
            io.to(data.oda).emit('yeni_mesaj', data);
        }
    });

    socket.on('kullanici_banla', (sId) => { banListesi.add(sId); });

    socket.on('disconnect', () => {
        if (masalar[socket.id]) {
            io.to(socket.id).emit('rakip_ayrildi');
            delete masalar[socket.id];
        } else {
            for (let id in masalar) {
                if (io.sockets.adapter.rooms.get(id)?.size < 2) {
                    io.to(id).emit('rakip_ayrildi');
                    delete masalar[id];
                }
            }
        }
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu ${PORT} aktif.`));
