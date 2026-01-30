const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

let masalar = {};

io.on('connection', (socket) => {
    // Yeni bağlanan kullanıcıya güncel listeyi gönder
    socket.emit('liste_guncelle', masalar);

    // MASA KURMA (MOR OYUNCU)
    socket.on('masa_kur', (data) => {
        const masaId = socket.id;
        masalar[masaId] = { id: masaId, isim: data.isim || "İsimsiz", durum: 'bekliyor' };
        socket.join(masaId); // Kurucu odaya girer
        io.emit('liste_guncelle', masalar);
    });

    // MASAYA KATILMA (TURUNCU OYUNCU)
    socket.on('masaya_otur', (masaId) => {
        if (masalar[masaId] && masalar[masaId].durum === 'bekliyor') {
            masalar[masaId].durum = 'dolu';
            socket.join(masaId); // Katılan odaya girer
            io.emit('liste_guncelle', masalar);
            // Her iki tarafa da oyunun başladığını teyit et
            io.to(masaId).emit('oyun_basla', { odaId: masaId });
        }
    });

    // HAMLE TRANSFERİ (KRİTİK NOKTA)
    socket.on('hamle_yap', (data) => {
        if (data.oda) {
            // Hamleyi gönderen hariç odadaki diğer oyuncuya ilet
            socket.to(data.oda).emit('hamle_geldi', data);
        }
    });

    // AYRILMA DURUMU
    socket.on('disconnect', () => {
        if (masalar[socket.id]) {
            io.to(socket.id).emit('rakip_ayrildi');
            delete masalar[socket.id];
        } else {
            for (let id in masalar) {
                if (io.sockets.adapter.rooms.get(id)?.size < 2) {
                    io.to(id).emit('rakip_ayrildi');
                    delete masalar[id];
                }
            }
        }
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu ${PORT} aktif.`));
