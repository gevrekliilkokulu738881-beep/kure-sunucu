let tournamentQueue = []; // Global değişken

io.on('connection', (socket) => {

    socket.on('joinTournament', (playerName) => {
        // Zaten kuyruktaysa tekrar ekleme
        const isAlreadyIn = tournamentQueue.find(p => p.id === socket.id);
        
        if (!isAlreadyIn) {
            tournamentQueue.push({ id: socket.id, name: playerName });
            console.log(`Kuyruğa katıldı: ${playerName}. Güncel sayı: ${tournamentQueue.length}`);
            
            // Tüm herkese güncel sayıyı duyur
            io.emit('tourUpdate', tournamentQueue.length);

            if (tournamentQueue.length >= 4) {
                const tourID = "T_" + Math.floor(Math.random() * 9000);
                const p = tournamentQueue.splice(0, 4); // İlk 4 kişiyi kuyruktan çıkar

                // Odaları belleğe işle
                rooms[tourID + "_M1"] = { password: "", hasPass: false, players: {}, owner: "SYS", ready: { mor: false, turuncu: false } };
                rooms[tourID + "_M2"] = { password: "", hasPass: false, players: {}, owner: "SYS", ready: { mor: false, turuncu: false } };

                console.log("Turnuva Başlatılıyor: ", tourID);

                // Oyuncuları eşleşmelere zorla gönder
                io.to(p[0].id).emit('startTourMatch', { room: tourID + "_M1" });
                io.to(p[1].id).emit('startTourMatch', { room: tourID + "_M1" });
                io.to(p[2].id).emit('startTourMatch', { room: tourID + "_M2" });
                io.to(p[3].id).emit('startTourMatch', { room: tourID + "_M2" });
                
                // Kuyruğu sıfırladıktan sonra diğerlerine bildir
                io.emit('tourUpdate', tournamentQueue.length);
            }
        }
    });

    socket.on('disconnect', () => {
        // Eğer kuyruktaki birisi sayfayı kapatırsa listeden çıkar
        tournamentQueue = tournamentQueue.filter(p => p.id !== socket.id);
        io.emit('tourUpdate', tournamentQueue.length);
    });
});
