const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);

// CORS ayarları: Dışarıdan gelen (senin bilgisayarın) bağlantılara tam izin verir
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Statik dosyaları sunmak için (Eğer index.html'i Render'a da yüklersen)
app.use(express.static(__dirname));

let masalar = {};
let socketOdaMap = {};
let revansIstekleri = {};

io.on('connection', (socket) => {
    console.log('Yeni oyuncu bağlandı:', socket.id);

    // Bağlanan oyuncuya güncel oda listesini gönder
    socket.emit('liste_guncelle', masalar);

    // MASA KURMA
    socket.on('masa_kur', (data) => {
        const odaId = "oda_" + socket.id;
        socket.join(odaId);
        
        // Odayı isimle kaydet
        masalar[odaId] = { 
            id: odaId, 
            morIsim: data.isim || "Oyuncu 1", 
            turuncuIsim: "", 
            durum: 'bekliyor' 
        };
        
        socketOdaMap[socket.id] = odaId;
        console.log(`${data.isim} masa kurdu: ${odaId}`);
        
        io.emit('liste_guncelle', masalar);
        socket.emit('bekleme_modu');
    });

    // MASAYA KATILMA
    socket.on('masaya_otur', (data) => {
        const id = data.id;
        if (masalar[id] && masalar[id].durum === 'bekliyor') {
            socket.join(id);
            
            // Katılanın ismini kaydet ve odayı doldur
            masalar[id].turuncuIsim = data.isim || "Oyuncu 2";
            masalar[id].durum = 'dolu';
            
            socketOdaMap[socket.id] = id;
            console.log(`${data.isim} masaya katıldı: ${id}`);
            
            io.emit('liste_guncelle', masalar);
            
            // Her iki tarafa da isimleri ve oda bilgisini gönder
            io.to(id).emit('oyun_basla', { 
                oda: id, 
                morIsim: masalar[id].morIsim, 
                turuncuIsim: masalar[id].turuncuIsim 
            });
        }
    });

    // HAMLE TRANSFERİ
    socket.on('hamle_yap', (data) => {
        // Gelen hamleyi diğer oyuncuya pasla
        socket.to(data.oda).emit('
