const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

let masalar = {};

io.on('connection', (socket) => {
    console.log("Bağlantı:", socket.id);
    
    // Bağlanan kişiye mevcut masaları hemen yolla
    socket.emit('liste_guncelle', masalar);

    // MASA KURMA
    socket.on('masa_kur', (data) => {
        const masaId = socket.id; // Masa ID'si kurucunun ID'si olsun
        masalar[masaId] = { 
            id: masaId, 
            isim: data.isim || "İsimsiz", 
            durum: 'bekliyor' 
        };
        console.log("Yeni masa açıldı:", masalar[masaId].isim);
        io.emit('liste_guncelle', masalar); // Herkese listeyi tazele
    });

    // MASAYA KATILMA
    socket.on('masaya_otur', (masaId) => {
        if (masalar[masaId]) {
            masalar[masaId].durum = 'dolu';
            io.emit('liste_guncelle', masalar);
            io.emit('oyun_basla', { oda: masaId });
        }
    });

    // HAMLE TRANSFERİ
    socket.on('hamle_yap', (data) => {
        io.emit('hamle_geldi', data);
    });

    // AYRILMA
    socket.on('disconnect', () => {
        if (masalar[socket.id]) {
            delete masalar[socket.id];
            io.emit('liste_guncelle', masalar);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu ${PORT} portunda hazir.`));
