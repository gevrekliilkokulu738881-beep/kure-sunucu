const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Tüm adreslerden gelen bağlantılara izin verir
        methods: ["GET", "POST"]
    }
});

let masalar = {}; 
let socketOdaMap = {}; 
let revansIstekleri = {}; // Rövanş taleplerini tutar

io.on('connection', (socket) => {
    console.log('Yeni Bağlantı:', socket.id);

    // Mevcut masaları yeni gelen oyuncuya gönder
    socket.emit('liste_guncelle', masalar);

    // MASA KURMA
    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        
        masalar[odaId] = { 
            id: odaId, 
            kurucu: socket.id, 
            isim: data.isim || "İsimsiz", 
            durum: 'bekliyor' 
        };
        
        socketOdaMap[socket.id] = odaId;
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu');
    });

    // MASAYA KATILMA
    socket.on('masaya_otur', (data) => {
        const odaId = data.id;
        if (masalar[odaId] && masalar[odaId].durum === 'bekliyor') {
            socket.join(odaId);
            masalar[odaId].durum = 'dolu';
            socketOdaMap[socket.id] = odaId;
            
            io.emit('liste_guncelle', masalar);
            io.to(odaId).emit('oyun_basla', { oda: odaId });
        }
    });

    // HAMLE İLETİMİ
    socket.on('hamle_yap', (data) => {
        // Hamleyi yapan hariç odadaki diğer kişiye gönder
        socket.to(data.oda).emit('hamle_geldi', data);
    });

    // RÖVANŞ / TEKRAR OYNA SİSTEMİ
    socket.on('revans_iste', (data) => {
        const odaId = data.oda;
        const role = data.role;

        if (!revansIstekleri[odaId]) {
            revansIstekleri[odaId] = {};
        }

        revansIstekleri[odaId][role] = true;

        // Diğer oyuncuya rakibinin rövanş istediğini bildir
        socket.to(odaId).emit('revans_teklifi', { role: role });

        // Eğer her iki oyuncu da (mor ve turuncu) onay verdiyse
        if (revansIstekleri[odaId].mor && revansIstekleri[odaId].turuncu) {
            delete revansIstekleri[odaId]; // İsteği temizle
            io.to(odaId).emit('oyun_reset'); // Oyunu yeniden başlat
        }
    });

    // AYRILMA VE KOPMA KONTROLÜ
    const ayrilmaKontrol = () => {
        const odaId = socketOdaMap[socket.id];
        if (odaId) {
            // Odadaki diğer oyuncuya bildir
            socket.to(odaId).emit('rakip_ayrildi');
            socket.to(odaId).emit('rakip_reddetti'); // Rövanş ekranındaysa kapatması için
            
            // Verileri temizle
            delete masalar[odaId];
            delete socketOdaMap[socket.id];
            delete revansIstekleri[odaId];
            
            io.emit('liste_guncelle', masalar);
        }
    };

    socket.on('disconnect', ayrilmaKontrol);
    socket.on('ayril', ayrilmaKontrol);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Küre Elite Sunucusu ${PORT} portunda aktif.`);
});
