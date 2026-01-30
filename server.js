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

    socket.on('masa_kur', (data) => {
        // Masa ID'sini kurucu socket ID'si yapıyoruz
        const masaId = socket.id;
        masalar[masaId] = { 
            id: masaId, 
            isim: data.isim || "İsimsiz Masa", 
            durum: 'bekliyor' 
        };
        socket.join(masaId);
        console.log("Masa kuruldu:", masaId);
        io.emit('liste_guncelle', masalar); // Herkese yeni masayı göster
    });

    socket.on('masaya_otur', (masaId) => {
        if (masalar[masaId] && masalar[masaId].durum === 'bekliyor') {
            masalar[masaId].durum = 'dolu';
            socket.join(masaId);
            io.emit('liste_guncelle', masalar); // Masa doldu, listeden kaldır/güncelle
            io.to(masaId).emit('oyun_basla', { oda: masaId });
        }
    });

    socket.on('hamle_yap', (data) => {
        if (data.oda) {
            // Hamleyi gönderen hariç odadaki diğerine ilet
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
