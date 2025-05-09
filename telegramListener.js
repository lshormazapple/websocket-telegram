const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { Api } = require("telegram");
const { client } = require('./telegram');

const TARGET_PEER_ID = '2680159475';
const codeRegex = /\b[a-zA-Z0-9]{8}\b/g;


const app = express();
app.use(cors({ origin: '*' })); // Promenite za produkciju
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map(); // Koristimo Map za efikasnije upravljanje klijentima

wss.on('connection', (ws) => {
    const clientId = generateClientId(); // Generisanje jedinstvenog ID-a
    clients.set(clientId, ws);

    console.log(`✅ WebSocket connected. Client ID: ${clientId}`);

    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        console.log(`Received message from ${clientId}:`, message);
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`❌ WebSocket disconnected. Client ID: ${clientId}`);
    });
});

const interval = setInterval(() => {
    clients.forEach((ws, clientId) => {
        if (ws.isAlive === false) {
            ws.terminate();
            clients.delete(clientId);
            console.log(`❌ WebSocket terminated. Client ID: ${clientId} (inactive)`);
            return;
        }

        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000);

// Postavljanje događaja za Telegram klijenta
client.addEventHandler(async (event) => {
    if (!event.message) return;

    const message = event.message;
    const messagePeerId =
        message.peerId?.channelId?.toString() ||
        message.peerId?.userId?.toString();

    if (messagePeerId !== TARGET_PEER_ID) return;

    // Slanje poruke na WebSocket
    try {
        console.log(`Sending message to ${clients.size} clients: ${message.message}`);
        clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "message", message: message.message }));
            }
        });

        const match = message.message.match(codeRegex);
        if (match) {
            for (const code of match) {
                console.log(`📤 Sending code to ${clients.size} clients: ${code}`);
                clients.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "new_code", code }));
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error while sending WebSocket message:", error);
    }
});

// Pokreni HTTP i WebSocket server na portu 8080
server.listen(8080, () => {
    console.log('WebSocket server listening on port 8080');
});

console.log('Telegram client initialized');

function generateClientId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}