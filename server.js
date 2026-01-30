const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let masalar = {};
let banListesi = new Set();

io.on('connection', (socket) => {
    console.log("Bağlandı:", socket.id);
    socket.emit('liste_guncelle', masalar);

    // MASA KURMA (MOR)
    socket.on('masa_kur', (data) => {
        masalar[socket.id] = { id: socket.id, isim: data.isim, durum: 'bekliyor', kurucuId: socket.id };
        socket.join(socket.id); // KRİTİK: Kurucu kendi odasına girmeli!
        io.emit('liste_guncelle', masalar);
    });

    // MASAYA OTURMA (TURUNCU)
    socket.on('masaya_otur', (masaId) => {
        if (masalar[masaId]) {
            masalar[masaId].durum = 'dolu';
            socket.join(masaId); // Turuncu odaya girer
            io.emit('liste_guncelle', masalar);
            // Her iki tarafa da oyunun başladığını ve oda ID'sini bildir
            io.to(masaId).emit('oyun_basla', { oda: masaId });
        }
    });

    // HAMLE TRANSFERİ
    socket.on('hamle_yap', (data) => {
        if (data.oda) {
            // Hamleyi gönderen hariç odadaki diğerine yolla
            socket.to(data.oda).emit('hamle_geldi', data);
        }
    });

    // SOHBET
    socket.on('mesaj_gonder', (data) => {
        if (!banListesi.has(socket.id)) {
            io.to(data.oda).emit('yeni_mesaj', data);
        }
    });

    socket.on('kullanici_banla', (socketId) => {
        banListesi.add(socketId);
    });

    // AYRILMA VE TEMİZLİK
    socket.on('disconnect', () => {
        if (masalar[socket.id]) {
            // Eğer masayı kuran çıktıysa odayı dağıt
            io.to(socket.id).emit('oyuncu_ayrildi');
            delete masalar[socket.id];
        } else {
            // Eğer katılan çıktıysa masayı tekrar boşa çıkar veya sil
            for (let id in masalar) {
                if (masalar[id].durum === 'dolu') {
                    // Bu odadaki biri mi çıktı kontrolü basitçe yapılabilir
                    // Şimdilik temizlik için masayı siliyoruz
                    io.to(id).emit('oyuncu_ayrildi');
                    delete masalar[id];
                }
            }
        }
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu ${PORT} aktif.`));
