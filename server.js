const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let masalar = {}; 
let socketOdaMap = {}; 
let revansIstekleri = {};

io.on('connection', (socket) => {
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { id: odaId, kurucu: socket.id, isim: data.isim || "Oyuncu", durum: 'bekliyor' };
        socketOdaMap[socket.id] = odaId;
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu');
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

    socket.on('revans_iste', (data) => {
        if(!revansIstekleri[data.oda]) revansIstekleri[data.oda] = {};
        revansIstekleri[data.oda][data.role] = true;
        socket.to(data.oda).emit('revans_teklifi', { role: data.role });
        if(revansIstekleri[data.oda].mor && revansIstekleri[data.oda].turuncu) {
            delete revansIstekleri[data.oda];
            io.to(data.oda).emit('oyun_reset');
        }
    });

    socket.on('disconnect', () => {
        const odaId = socketOdaMap[socket.id];
        if (odaId) {
            socket.to(odaId).emit('rakip_ayrildi');
            delete masalar[odaId]; delete socketOdaMap[socket.id];
            io.emit('liste_guncelle', masalar);
        }
    });
});

httpServer.listen(3000, () => console.log("Sunucu 3000 portunda hazır."));
