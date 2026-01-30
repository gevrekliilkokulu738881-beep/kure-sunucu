const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Dosyaları sunucunun içine gömüyoruz
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let masalar = {};

io.on('connection', (socket) => {
    // Yeni girene masaları göster
    socket.emit('liste', masalar);

    socket.on('kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { 
            id: odaId, 
            mor: data.isim || "Oyuncu 1", 
            turuncu: "", 
            durum: 'bekliyor' 
        };
        io.emit('liste', masalar);
        socket.emit('kuruldu', odaId);
    });

    socket.on('katil', (data) => {
        const id = data.id;
        if (masalar[id] && masalar[id].durum === 'bekliyor') {
            socket.join(id);
            masalar[id].turuncu = data.isim || "Oyuncu 2";
            masalar[id].durum = 'dolu';
            io.emit('liste', masalar);
            io.to(id).emit('basla', masalar[id]);
        }
    });

    socket.on('hamle', (data) => {
        socket.to(data.oda).emit('rakip_hamle', data);
    });

    socket.on('disconnect', () => {
        for (let id in masalar) {
            if (id.includes(socket.id)) {
                socket.to(id).emit('koptu');
                delete masalar[id];
            }
        }
        io.emit('liste', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log("Sistem Hazir!"));
