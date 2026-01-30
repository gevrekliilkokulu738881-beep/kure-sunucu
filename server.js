const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// GitHub'daki dosyaları servis et
app.use(express.static(path.join(__dirname, '.')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let masalar = {};
let socketOdaMap = {};

io.on('connection', (socket) => {
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { id: odaId, isim: data.isim || "Oyuncu", durum: 'bekliyor' };
        socketOdaMap[socket.id] = odaId;
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu');
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

    socket.on('disconnect', () => {
        const odaId = socketOdaMap[socket.id];
        if (odaId) {
            socket.to(odaId).emit('rakip_ayrildi');
            delete masalar[odaId];
        }
        io.emit('liste_guncelle', masalar);
    });
});

// RENDER PORT AYARI
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Oyun ${PORT} portunda yayında.`));
