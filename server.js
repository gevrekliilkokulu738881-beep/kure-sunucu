let rooms = {}; // Odaları tuttuğumuz yer

io.on('connection', (socket) => {
    // Mevcut odaları yeni bağlanan kişiye gönder
    socket.emit('roomList', rooms);

    socket.on('createRoom', (data) => {
        const name = data.roomName;
        if (!rooms[name]) {
            rooms[name] = { players: 0 }; // Odayı kaydet
            socket.emit('roomCreated', name); // Kurana haber ver
            io.emit('roomList', rooms); // Herkese listeyi güncelle
        }
    });

    socket.on('joinGame', (data) => {
        const name = data.roomName;
        if (rooms[name] && rooms[name].players < 2) {
            socket.join(name);
            rooms[name].players++;
            io.emit('roomList', rooms); // Sayı değişince listeyi güncelle
            // ... diğer roller
        }
    });
});
