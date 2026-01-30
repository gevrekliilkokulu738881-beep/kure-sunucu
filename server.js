const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// Render için en güvenli statik dosya sunma yöntemi
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket mantığı (öncekiyle aynı)
let masalar = {};
let socketOdaMap = {};

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id); // Render loglarında bunu görmelisin

    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { id: odaId, isim: data.isim, durum: 'bekliyor' };
        socketOdaMap[socket.id] = odaId;
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu');
    });
    
    // ... diğer socket listener'ları (masaya_otur, hamle_yap vb.)
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
