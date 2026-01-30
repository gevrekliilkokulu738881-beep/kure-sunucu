const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" } // Dışarıdan bağlantı engellerini kaldırır
});

// index.html dosyasını aynı klasörde tut
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let masalar = {}; 
let socketOdaMap = {}; 
let revansIstekleri = {};

io.on('connection', (socket) => {
    console.log('Bağlantı başarılı:', socket.id);
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { id: odaId, kurucu: socket.id, isim: data.isim || "Anonim", durum: 'bekliyor' };
        socketOdaMap[socket.id] = odaId;
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu');
        console.log('Masa kuruldu:', odaId);
    });

    socket.on('masaya_otur', (id) => {
        if (masalar[id] && masalar[id].durum === 'bekliyor') {
            socket.join(id);
            masalar[id].durum = 'dolu';
            socketOdaMap[socket.id] = id;
            io.emit('liste_guncelle', masalar);
            io.to(id).emit('oyun_basla', { oda: id });
        }
    });

    socket.on('hamle_yap', (data) => {
        socket.to(data.oda).emit('hamle_geldi', data);
    });

    socket.on('revans_iste', (data) => {
        if(!revansIstekleri[data.oda]) revansIstekleri[data.oda] = {};
        revansIstekleri[data.oda][data.role] = true;
        socket.to(data.oda).emit('revans_teklifi', { role: data.role });
        if(revansIstekleri[data.oda].mor && revansIstekleri[data.oda].turuncu) {
            delete revansIstekleri[data.oda];
            io.to(data.oda).emit('oyun_reset');
        }
    });

    socket.on('disconnect', () => {
        const odaId = socketOdaMap[socket.id];
        if (odaId) {
            socket.to(odaId).emit('rakip_ayrildi');
            delete masalar[odaId]; delete socketOdaMap[socket.id];
        }
        io.emit('liste_guncelle', masalar);
    });
});

httpServer.listen(3000, () => {
    console.log("SERVER AKTİF: http://localhost:3000 adresine git!");
});
