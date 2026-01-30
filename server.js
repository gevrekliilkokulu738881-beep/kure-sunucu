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
        masalar[socket.id] = { 
            id: socket.id, 
            isim: data.isim || "İsimsiz", 
            sifre: (data.sifre && data.sifre.trim() !== "") ? data.sifre : null, 
            durum: 'bekliyor' 
        };
        io.emit('liste_guncelle', masalar);
    });

    socket.on('masaya_otur', (data) => {
        if (masalar[data.id] && masalar[data.id].durum === 'bekliyor') {
            if (masalar[data.id].sifre && masalar[data.id].sifre !== data.sifre) {
                socket.emit('hata', 'Hatalı şifre!');
                return;
            }
            masalar[data.id].durum = 'dolu';
            io.emit('liste_guncelle', masalar);
            io.emit('oyun_basla', { oda: data.id });
        }
    });

    socket.on('hamle_yap', (data) => io.emit('hamle_geldi', data));
    socket.on('chat_gonder', (data) => io.emit('chat_geldi', data));

    // Masadan manuel ayrılma veya bağlantı kopma
    const temizle = () => {
        if (masalar[socket.id]) {
            delete masalar[socket.id];
            io.emit('liste_guncelle', masalar);
        }
    };

    socket.on('disconnect', temizle);
    socket.on('masayi_kapat', temizle);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu aktif.`));
