const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

let masalar = {}; // Oda bilgilerini tutar
let oyuncuOdaMap = {}; // Hangi socketId hangi odaId'de?

io.on('connection', (socket) => {
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        const odaId = socket.id;
        masalar[odaId] = { 
            id: odaId, 
            isim: data.isim || "İsimsiz", 
            sifre: (data.sifre && data.sifre.trim() !== "") ? data.sifre : null, 
            durum: 'bekliyor',
            oyuncular: [socket.id]
        };
        oyuncuOdaMap[socket.id] = odaId;
        io.emit('liste_guncelle', masalar);
    });

    socket.on('masaya_otur', (data) => {
        const odaId = data.id;
        if (masalar[odaId] && masalar[odaId].durum === 'bekliyor') {
            if (masalar[odaId].sifre && masalar[odaId].sifre !== data.sifre) {
                socket.emit('hata', 'Hatalı şifre!');
                return;
            }
            masalar[odaId].durum = 'dolu';
            masalar[odaId].oyuncular.push(socket.id);
            oyuncuOdaMap[socket.id] = odaId; // Misafiri de haritaya ekle
            io.emit('liste_guncelle', masalar);
            io.emit('oyun_basla', { oda: odaId });
        }
    });

    socket.on('hamle_yap', (data) => io.emit('hamle_geldi', data));
    socket.on('chat_gonder', (data) => io.emit('chat_geldi', data));

    const temizle = () => {
        const odaId = oyuncuOdaMap[socket.id];
        if (odaId) {
            // ODADAKİ HERKESE (Ayrılan dahil değil) BİLDİR
            io.emit('rakip_ayrildi', { oda: odaId });

            // Masayı tamamen sil ve oyuncu haritasını temizle
            if (masalar[odaId]) {
                masalar[odaId].oyuncular.forEach(pId => {
                    delete oyuncuOdaMap[pId];
                });
                delete masalar[odaId];
            }
            io.emit('liste_guncelle', masalar);
        }
    };

    socket.on('disconnect', temizle);
    socket.on('masayi_kapat', temizle);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu 2026 Sorunsuz Ayrılma Modu Aktif.`));
