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
            isim: data.isim, 
            sifre: data.sifre || null, 
            durum: 'bekliyor' 
        };
        io.emit('liste_guncelle', masalar);
    });

    socket.on('masaya_otur', (data) => {
        const masa = masalar[data.id];
        if (masa && masa.durum === 'bekliyor') {
            if (masa.sifre && masa.sifre !== data.sifre) {
                socket.emit('hata', 'Hatalı şifre!');
                return;
            }
            masa.durum = 'dolu';
            io.emit('liste_guncelle', masalar);
            io.emit('oyun_basla', { oda: data.id });
        }
    });

    socket.on('hamle_yap', (data) => io.emit('hamle_geldi', data));
    socket.on('chat_gonder', (data) => io.emit('chat_geldi', data));

    socket.on('disconnect', () => {
        if (masalar[socket.id]) delete masalar[socket.id];
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu aktif.`));
