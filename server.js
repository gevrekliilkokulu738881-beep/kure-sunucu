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
        const odaId = "oda_" + socket.id; // Benzersiz oda ID
        socket.join(odaId);
        masalar[odaId] = { 
            id: odaId, 
            kurucu: socket.id,
            isim: data.isim || "İsimsiz", 
            durum: 'bekliyor'
        };
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu', { odaId });
    });

    socket.on('masaya_otur', (data) => {
        const odaId = data.id;
        if (masalar[odaId] && masalar[odaId].durum === 'bekliyor') {
            socket.join(odaId);
            masalar[odaId].durum = 'dolu';
            io.emit('liste_guncelle', masalar);
            // Odadaki herkese (kurucu ve katılan) başlat gönder
            io.to(odaId).emit('oyun_basla', { oda: odaId });
        }
    });

    socket.on('hamle_yap', (data) => {
        // Hamleyi odadaki diğer kişiye gönder
        socket.to(data.oda).emit('hamle_geldi', data);
    });

    socket.on('chat_gonder', (data) => {
        io.to(data.oda).emit('chat_geldi', data);
    });

    socket.on('disconnect', () => {
        // Hangi odadaysa oraya ayrıldı gönder ve masayı sil
        Object.keys(masalar).forEach(odaId => {
            if (masalar[odaId].kurucu === socket.id || socket.rooms.has(odaId)) {
                io.to(odaId).emit('rakip_ayrildi');
                delete masalar[odaId];
            }
        });
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu 2026 stabil.`));
