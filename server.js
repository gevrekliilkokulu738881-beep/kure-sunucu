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
        const odaId = socket.id;
        socket.join(odaId);
        masalar[odaId] = { 
            id: odaId, 
            isim: data.isim || "İsimsiz", 
            sifre: (data.sifre && data.sifre.trim() !== "") ? data.sifre : null, 
            durum: 'bekliyor'
        };
        socketOdaMap[socket.id] = odaId;
        // Kurana başarılı olduğunu bildir
        socket.emit('masa_kuruldu', { odaId });
        io.emit('liste_guncelle', masalar);
    });

    socket.on('masaya_otur', (data) => {
        const odaId = data.id;
        if (masalar[odaId] && masalar[odaId].durum === 'bekliyor') {
            if (masalar[odaId].sifre && masalar[odaId].sifre !== data.sifre) {
                socket.emit('hata', 'Hatalı şifre!');
                return;
            }
            socket.join(odaId);
            masalar[odaId].durum = 'dolu';
            socketOdaMap[socket.id] = odaId;
            io.emit('liste_guncelle', masalar);
            // Odadaki her iki tarafa da oyunu başlat komutu gönder
            io.to(odaId).emit('oyun_basla', { oda: odaId });
        }
    });

    socket.on('hamle_yap', (data) => {
        socket.to(data.oda).emit('hamle_geldi', data);
    });

    socket.on('chat_gonder', (data) => {
        io.to(data.oda).emit('chat_geldi', data);
    });

    const temizle = () => {
        const odaId = socketOdaMap[socket.id];
        if (odaId) {
            socket.to(odaId).emit('rakip_ayrildi');
            delete masalar[odaId];
            delete socketOdaMap[socket.id];
            io.emit('liste_guncelle', masalar);
        }
    };

    socket.on('disconnect', temizle);
    socket.on('masayi_kapat', temizle);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu 2026 stabil modda.`));
