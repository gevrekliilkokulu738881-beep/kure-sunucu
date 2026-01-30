const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// CORS ayarı: Her yerden gelen bağlantıya izin veriyoruz
const io = new Server(httpServer, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

let masalar = {};
let socketOdaMap = {};
let revansIstekleri = {};

io.on('connection', (socket) => {
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { id: odaId, isim: data.isim || "Oyuncu", durum: 'bekliyor' };
        socketOdaMap[socket.id] = odaId;
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu');
    });

    socket.on('masaya_otur', (id) => {
        if (masalar[id] && masalar[id].durum === 'bekliyor') {
            socket.join(id);
            masalar[id].durum = 'dolu';
            socketOdaMap[socket.id] = id;
            io.emit('liste_guncelle', masalar);
            io.to(id).emit('oyun_basla', { oda: id });
        }
    });

    socket.on('hamle_yap', (data) => {
        socket.to(data.oda).emit('hamle_geldi', data);
    });

    socket.on('revans_iste', (data) => {
        const odaId = data.oda;
        if(!revansIstekleri[odaId]) revansIstekleri[odaId] = {};
        revansIstekleri[odaId][data.role] = true;
        socket.to(odaId).emit('revans_teklifi', { role: data.role });
        if(revansIstekleri[odaId].mor && revansIstekleri[odaId].turuncu) {
            delete revansIstekleri[odaId];
            io.to(odaId).emit('oyun_reset');
        }
    });

    socket.on('disconnect', () => {
        const odaId = socketOdaMap[socket.id];
        if (odaId) {
            socket.to(odaId).emit('rakip_ayrildi');
            delete masalar[odaId];
        }
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log("Sunucu hazir."));
