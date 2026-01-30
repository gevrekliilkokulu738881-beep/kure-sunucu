const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// OYUN EKRANI (HTML & JS BURADA)
const HTML_CODE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-select=none">
    <title>Küre Elite 2026</title>
    <script src="/socket.io/socket.io.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
    <style>
        :root { --mor: #a020f0; --turuncu: #ff8c00; --bg: #0f172a; --panel: #1e293b; --accent: #38bdf8; --text: #f1f5f9; }
        body { font-family: sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; flex-direction: column; align-items: center; min-height: 100vh; overflow: hidden; }
        .box { background: var(--panel); border-radius: 20px; padding: 20px; width: 90%; max-width: 400px; margin-top: 15px; text-align: center; }
        .board { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; background: #334155; padding: 10px; border-radius: 15px; }
        .slot { background: #0f172a; border-radius: 50%; aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid transparent; }
        .slot.selected { border-color: var(--accent); background: #1e3a8a; }
        .sphere { width: 85%; height: 85%; border-radius: 50%; box-shadow: inset -3px -3px 6px rgba(0,0,0,0.6); }
        .mor { background: radial-gradient(circle at 35% 35%, #d8b4fe, var(--mor)); }
        .turuncu { background: radial-gradient(circle at 35% 35%, #fdba74, var(--turuncu)); }
        .flipped-board { transform: rotate(180deg); }
        #waiting, #game-over { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; flex-direction: column; align-items: center; justify-content: center; }
        button { width: 100%; padding: 12px; border-radius: 8px; border: none; background: var(--accent); font-weight: bold; cursor: pointer; color: #0f172a; margin-top: 10px; }
        input { width: 100%; padding: 10px; border-radius: 8px; margin-bottom: 10px; background: #0f172a; color: white; border: 1px solid #444; box-sizing: border-box; }
    </style>
</head>
<body>
    <div id="waiting"><h2>RAKİP BEKLENİYOR...</h2><button onclick="location.reload()">İPTAL</button></div>
    <div id="game-over"><h1 id="win-name">-</h1><button onclick="location.reload()">LOBİYE DÖN</button></div>
    <div id="lobby" class="box">
        <h1>KÜRE ELİTE</h1>
        <input type="text" id="nick" placeholder="Adınız...">
        <button onclick="kur()">MASA KUR (Online)</button>
        <button onclick="startBot()" style="background:#8b5cf6; color:white;">BOTA KARŞI OYNA</button>
        <div id="room-list" style="margin-top:15px;"></div>
    </div>
    <div id="game" class="box" style="display:none;">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="color:var(--mor);">MOR: <b id="can-mor">7</b></span>
            <span id="timer" style="color:red; font-weight:bold;">60</span>
            <span style="color:var(--turuncu);">TUR: <b id="can-tur">7</b></span>
        </div>
        <div id="turn-txt" style="font-weight:bold;">SIRA: MOR</div>
        <div id="board" class="board"></div>
    </div>
    <script>
        const socket = io();
        let myRole, myOda, currentTurn = 'mor', board = Array(49).fill(null), selected = null, isBot = false, timerVal = 60, timerInt;

        function checkValid(f, t, role) {
            const fy = Math.floor(f/7), ty = Math.floor(t/7), fx = f%7, tx = t%7;
            if (fy === ty) return "Yan";
            if (Math.abs(ty-fy) > 1 || Math.abs(tx-fx) > 1) return "Adım";
            if (role === 'mor' && fy < 6 && ty === 6) return "Kale";
            if (role === 'turuncu' && fy > 0 && ty === 0) return "Kale";
            return null;
        }

        function execute(f, t) {
            if(checkValid(f, t, currentTurn)) return;
            board[t] = board[f]; board[f] = null;
            const rakip = currentTurn === 'mor' ? 'turuncu' : 'mor';
            [1,-1,7,-7,8,-8,6,-6].forEach(d => {
                if(board[t+d] === rakip && board[t+(d*2)] === currentTurn) board[t+d] = null;
            });
            [[1,-1],[7,-7],[8,-8],[6,-6]].forEach(([d1, d2]) => {
                if(board[t+d1] === rakip && board[t+d2] === rakip) board[t] = null;
            });
            currentTurn = rakip; selected = null; render();
            if(!checkEnd()) { startTimer(); if(isBot && currentTurn !== myRole) setTimeout(auto, 800); }
        }

        function checkEnd() {
            let m = board.filter(x => x === 'mor').length, t = board.filter(x => x === 'turuncu').length;
            document.getElementById('can-mor').innerText = m; document.getElementById('can-tur').innerText = t;
            if (m <= 3 || t <= 3) {
                clearInterval(timerInt);
                document.getElementById('game-over').style.display = 'flex';
                document.getElementById('win-name').innerText = (m <= 3 ? "TURUNCU" : "MOR") + " KAZANDI!";
                confetti({ particleCount: 150 }); return true;
            }
            return false;
        }

        function render() {
            const div = document.getElementById('board'); div.innerHTML = '';
            board.forEach((v, i) => {
                const s = document.createElement('div'); s.className = 'slot' + (selected === i ? ' selected' : '');
                if(v) s.innerHTML = '<div class="sphere ' + v + '"></div>';
                s.onclick = () => {
                    if(currentTurn !== myRole) return;
                    if(board[i] === myRole) { selected = i; render(); }
                    else if(selected !== null && !board[i]) {
                        execute(selected, i);
                        if(!isBot) socket.emit('hamle_yap', { oda: myOda, board, nextTurn: currentTurn });
                    }
                };
                div.appendChild(s);
            });
            document.getElementById('turn-txt').innerText = "SIRA: " + currentTurn.toUpperCase();
        }

        function startTimer() {
            clearInterval(timerInt); timerVal = 60;
            timerInt = setInterval(() => {
                timerVal--; document.getElementById('timer').innerText = timerVal;
                if(timerVal <= 0 && currentTurn === myRole) auto();
            }, 1000);
        }

        function auto() {
            let moves = [];
            board.forEach((v,i) => {
                if(v === currentTurn) {
                    [7,-7,8,-8,6,-6].forEach(d => {
                        const t = i + d;
                        if(t >= 0 && t < 49 && !board[t] && !checkValid(i, t, currentTurn)) moves.push({f:i, t:t});
                    });
                }
            });
            if(moves.length) {
                const m = moves[Math.floor(Math.random()*moves.length)];
                execute(m.f, m.t);
                if(!isBot) socket.emit('hamle_yap', { oda: myOda, board, nextTurn: currentTurn });
            }
        }

        function initGame() {
            board.fill(null); for(let i=0; i<7; i++) board[i]='turuncu'; for(let i=42; i<49; i++) board[i]='mor';
            document.getElementById('board').classList[myRole==='turuncu'?'add':'remove']('flipped-board');
            currentTurn = 'mor'; render(); startTimer();
        }

        function startBot() { isBot=true; myRole='mor'; document.getElementById('lobby').style.display='none'; document.getElementById('game').style.display='block'; initGame(); }
        function kur() { myRole='mor'; socket.emit('masa_kur', { isim: document.getElementById('nick').value }); }
        function katil(id) { myRole='turuncu'; socket.emit('masaya_otur', id); }

        socket.on('liste_guncelle', (m) => {
            const list = document.getElementById('room-list'); list.innerHTML = "";
            Object.values(m).forEach(room => { if(room.durum==='bekliyor') list.innerHTML += '<button onclick="katil(\\'' + room.id + '\\')">' + room.isim + ' Katıl</button>'; });
        });
        socket.on('bekleme_modu', () => document.getElementById('waiting').style.display='flex');
        socket.on('oyun_basla', (d) => { myOda=d.oda; document.getElementById('waiting').style.display='none'; document.getElementById('lobby').style.display='none'; document.getElementById('game').style.display='block'; initGame(); });
        socket.on('hamle_geldi', (d) => { board=d.board; currentTurn=d.nextTurn; render(); if(!checkEnd()) startTimer(); });
        socket.on('rakip_ayrildi', () => { alert("Rakip gitti!"); location.reload(); });
    </script>
</body>
</html>
`;

app.get('/', (req, res) => { res.send(HTML_CODE); });

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
    socket.on('hamle_yap', (data) => { socket.to(data.oda).emit('hamle_geldi', data); });
    socket.on('disconnect', () => {
        const odaId = socketOdaMap[socket.id];
        if (odaId) { socket.to(odaId).emit('rakip_ayrildi'); delete masalar[odaId]; }
        io.emit('liste_guncelle', masalar);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log('Yayında.'));
