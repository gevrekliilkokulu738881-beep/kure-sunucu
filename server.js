const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

let masalar = {};

io.on('connection', (socket) => {
    console.log("Bağlantı sağlandı:", socket.id);
    
    // Bağlanan herkese güncel listeyi yolla
    socket.emit('liste_guncelle', masalar);

   // server.js içindeki ilgili kısımları bu şekilde düzelt:

socket.on('masa_kur', (data) => {
    const masaId = socket.id;
    masalar[masaId] = { id: masaId, isim: data.isim, durum: 'bekliyor' };
    socket.join(masaId); // KURUCU ODAYA GİRER
    io.emit('liste_guncelle', masalar);
});

socket.on('masaya_otur', (masaId) => {
    if (masalar[masaId]) {
        masalar[masaId].durum = 'dolu';
        socket.join(masaId); // KATILAN ODAYA GİRER
        io.emit('liste_guncelle', masalar);
        // İki tarafa da oyunun başladığını ve oda ID'sini bildir
        io.to(masaId).emit('oyun_basla', { oda: masaId });
    }
});

socket.on('hamle_yap', (data) => {
    // Hamleyi odaya gönder (gönderen kişi hariç herkese gider)
    if (data.oda) {
        socket.to(data.oda).emit('hamle_geldi', data);
    }
});

    socket.on('disconnect', () => {
        console.log("Ayrıldı:", socket.id);
        if (masalar[socket.id]) {
            delete masalar[socket.id];
        }
        // Eğer katılan biriyse masayı tekrar 'bekliyor' moduna almak yerine güvenli olması için siliyoruz
        for (let id in masalar) {
            if (id === socket.id) delete masalar[id];
        }
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu ${PORT} portunda hazır.`));

