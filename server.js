const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// HTML ve diğer dosyaları sunmak için
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let masalar = {};

io.on('connection', (socket) => {
    socket.emit('liste_guncelle', masalar);

    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        masalar[odaId] = { 
            id: odaId, 
            morIsim: data.isim || "Oyuncu 1", 
            turuncuIsim: "", 
            durum: 'bekliyor' 
        };
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu');
    });

    socket.on('masaya_otur', (data) => {
        const id = data.id;
        if (masalar[id] && masalar[id].durum === 'bekliyor') {
            socket.join(id);
            masalar[id].turuncuIsim = data.isim || "Oyuncu 2";
            masalar[id].durum = 'dolu';
            io.emit('liste_guncelle', masalar);
            io.to(id).emit('oyun_basla', { 
                oda: id, 
                morIsim: masalar[id].morIsim, 
                turuncuIsim: masalar[id].turuncuIsim 
            });
        }
    });

    socket.on('hamle_yap', (data) => {
        socket.to(data.oda).emit('hamle_geldi', data);
    });

    socket.on('disconnect', () => {
        for (let id in masalar) {
            if (id.includes(socket.id)) {
                socket.to(id).emit('rakip_ayrildi');
                delete masalar[id];
            }
        }
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => console.log("Server Live on " + PORT));
