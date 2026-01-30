const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

let masalar = {}; 
let socketOdaMap = {}; 

io.on('connection', (socket) => {
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { id: odaId, kurucu: socket.id, isim: data.isim || "İsimsiz", durum: 'bekliyor' };
        socketOdaMap[socket.id] = odaId;
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu'); // Kurana onay gönder
    });

    socket.on('masaya_otur', (data) => {
        const odaId = data.id;
        if (masalar[odaId] && masalar[odaId].durum === 'bekliyor') {
            socket.join(odaId);
            masalar[odaId].durum = 'dolu';
            socketOdaMap[socket.id] = odaId;
            io.emit('liste_guncelle', masalar);
            io.to(odaId).emit('oyun_basla', { oda: odaId });
        }
    });

    socket.on('hamle_yap', (data) => socket.to(data.oda).emit('hamle_geldi', data));

    socket.on('disconnect', () => {
        const odaId = socketOdaMap[socket.id];
        if (odaId) {
            socket.to(odaId).emit('rakip_ayrildi');
            delete masalar[odaId];
            delete socketOdaMap[socket.id];
            io.emit('liste_guncelle', masalar);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log("Sunucu Hazır."));
