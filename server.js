<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-select=none">
    <title>Küre Elite 2026 - Stable</title>
    <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
    <style>
        :root { --mor: #a020f0; --turuncu: #ff8c00; --bg: #0f172a; --panel: #1e293b; --accent: #38bdf8; --text: #f1f5f9; }
        body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; flex-direction: column; align-items: center; min-height: 100vh; overflow-x: hidden; }
        .box { background: var(--panel); border-radius: 20px; padding: 25px; width: 90%; max-width: 400px; margin-top: 20px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }
        .room-item { background: rgba(15, 23, 42, 0.6); padding: 12px; margin-bottom: 10px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #334155; }
        .board { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; background: #334155; padding: 10px; border-radius: 15px; margin-top: 10px; }
        .flipped-board { transform: rotate(180deg); }
        .flipped-board .sphere { transform: rotate(180deg); }
        .slot { background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center; aspect-ratio: 1/1; cursor: pointer; border: 2px solid transparent; }
        .slot.selected { border-color: var(--accent); background: #1e3a8a; }
        .sphere { width: 85%; height: 85%; border-radius: 50%; box-shadow: inset -4px -4px 8px rgba(0,0,0,0.7); transition: 0.3s; }
        .mor { background: radial-gradient(circle at 35% 35%, #d8b4fe, var(--mor)); }
        .turuncu { background: radial-gradient(circle at 35% 35%, #fdba74, var(--turuncu)); }
        #timer-display { font-size: 1.5rem; font-weight: bold; color: #ef4444; background: rgba(0,0,0,0.3); padding: 5px 15px; border-radius: 20px; border: 2px solid #ef4444; }
        #chat-area { margin-top: 15px; background: rgba(0,0,0,0.25); border-radius: 12px; padding: 10px; border: 1px solid #334155; }
        #chat-messages { height: 80px; overflow-y: auto; text-align: left; font-size: 0.85rem; border-bottom: 1px solid #444; }
        .emoji-bar { display: flex; justify-content: space-between; padding: 5px 0; font-size: 1.4rem; cursor: pointer; }
        input, button { width: 100%; padding: 14px; margin-top: 10px; border-radius: 10px; border: none; font-size: 1rem; box-sizing: border-box; }
        input { background: #0f172a; color: white; border: 1px solid #444; }
        button { background: var(--accent); color: #0f172a; font-weight: bold; cursor: pointer; }
        #music-btn { position: fixed; top: 15px; right: 15px; background: var(--panel); border: 1px solid var(--accent); border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; z-index: 1000; cursor: pointer; }
    </style>
</head>
<body>

<div id="music-btn" onclick="toggleMusic()">🎵</div>

<div id="lobby-screen" class="box">
    <h2 style="color:var(--accent); margin:0;">KÜRE ELİTE</h2>
    <input type="text" id="username" placeholder="Adınız...">
    <input type="text" id="room-pass" placeholder="Şifre (Boşsa Şifresiz)">
    <button onclick="createRoom()">MASA KUR</button>
    <button style="background:#8b5cf6; color:white;" onclick="startBotGame()">🤖 BOTA KARŞI OYNA</button>
    <div id="room-list" style="margin-top:20px;"></div>
</div>

<div id="game-screen" style="display:none; width:95%; max-width:410px; margin-top:10px;">
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(0,0,0,0.4); border-radius:12px; border: 1px solid #3
