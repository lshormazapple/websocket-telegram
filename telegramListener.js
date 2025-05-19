const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { Api } = require("telegram");
const { client } = require('./telegram');

const TARGET_PEER_ID = '2680159475';
const codeRegex = /^[a-zA-Z0-9]{8}$/;

const app = express();
app.use(cors({ origin: '*' }));
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = generateClientId();
    clients.set(clientId, ws);

    console.log(`✅ WebSocket connected. Client ID: ${clientId}. Total clients: ${clients.size}`);

    ws.isAlive = true;

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        console.log(`📨 Received from ${clientId}:`, message.toString());
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`❌ WebSocket disconnected. Client ID: ${clientId}. Clients left: ${clients.size}`);
    });
});

// Ping loop za mrtve WS klijente
setInterval(() => {
    clients.forEach((ws, clientId) => {
        if (!ws.isAlive) {
            ws.terminate();
            clients.delete(clientId);
            console.log(`❌ WS client ${clientId} terminated (no pong)`);
        } else {
            ws.isAlive = false;
            ws.ping();
        }
    });
}, 30000);

// Telegram poruke
client.addEventHandler(async (event) => {
    if (!event.message) return;

    const message = event.message;
    const messagePeerId =
        message.peerId?.channelId?.toString() ||
        message.peerId?.userId?.toString();

    console.log(`📥 Poruka od peerId=${messagePeerId}: ${message.message}`);

    if (messagePeerId !== TARGET_PEER_ID) {
        console.log(`⚠️ Ignorisana poruka. Ne odgovara TARGET_PEER_ID: ${TARGET_PEER_ID}`);
        return;
    }

    const messageText = message.message?.trim();

    // Slanje poruke svim WS klijentima
    if (clients.size === 0) {
        console.log('⚠️ Nema WebSocket klijenata povezanih – poruka nije poslata nikome.');
    } else {
        console.log(`📤 Šaljem poruku "${messageText}" ka ${clients.size} WS klijenata.`);
    }

    clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ type: "message", message: messageText }));
            } catch (err) {
                console.error("❌ WS send greška:", err.message);
            }
        }
    });

    // ✅ Slanje samo ako je cela poruka validan kod (8 znakova, bez razmaka)
    if (messageText && codeRegex.test(messageText)) {
        console.log(`📤 Validan kod detektovan: ${messageText}`);
        clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({ type: "new_code", code: messageText }));
                } catch (err) {
                    console.error("❌ WS send greška kod slanja koda:", err.message);
                }
            }
        });
    } else {
        console.log(`🚫 Poruka nije kod: "${messageText}"`);
    }
});

// Start servera
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 WebSocket server pokrenut na portu ${PORT}`);
});

console.log('✅ Telegram client initialized');

function generateClientId() {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
}
