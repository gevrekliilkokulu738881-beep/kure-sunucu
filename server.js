const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let masalar = {};

io.on('connection', (socket) => {
    // Mevcut masaları gönder
    socket.emit('liste', masalar);

    socket.on('kur', (isim) => {
        const odaId = "oda_" + socket.id;
        masalar[odaId] = { id: odaId, sahibi: isim || "Oyuncu", durum: 'bekliyor' };
        socket.join(odaId);
        io.emit('liste', masalar); // Herkese listeyi güncelle
        socket.emit('oda_onay', odaId);
    });

    socket.on('katil', (odaId) => {
        if (masalar[odaId]) {
            masalar[odaId].durum = 'dolu';
            socket.join(odaId);
            io.emit('liste', masalar);
            io.to(odaId).emit('baslat', odaId);
        }
    });

    socket.on('hamle', (data) => {
        socket.to(data.oda).emit('rakip_hamle', data);
    });

    socket.on('disconnect', () => {
        const odaId = "oda_" + socket.id;
        if (masalar[odaId]) {
            delete masalar[odaId];
            io.emit('liste', masalar);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Sunucu " + PORT + " üzerinde aktif."));
