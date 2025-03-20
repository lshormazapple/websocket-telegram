const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");
const { client } = require("./telegram");  // Povezivanje sa Telegram klijentom

const TARGET_PEER_ID = "2320489201";  // ID ciljanog korisnika
const codeRegex = /\b[A-Z]{8}\b|\b[A-Z0-9]{8}\b/g;  // Regex za kodove

const app = express();

// Omogućavanje CORS-a
app.use(cors({
    origin: '*',  // Dozvoljava sve domene (ne preporučuje se)
}));

const server = require('http').createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ WebSocket connected.');
  
  // Postavljanje događaja za primanje poruka
  ws.on('message', (message) => {
    console.log('Received message:', message);
  });

  // Obrada kada se WebSocket zatvori
  ws.on('close', () => {
    console.log('❌ WebSocket disconnected.');
  });
});

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
    ws.send(JSON.stringify({ type: "message", message: message.message }));

    const match = message.message.match(codeRegex);
    if (match) {
      for (const code of match) {
        console.log(`📤 Sending code to WebSocket: ${code}`);
        ws.send(JSON.stringify({ type: "new_code", code }));
      }
    }
  } catch (error) {
    console.error("Error while sending WebSocket message:", error);
  }
});

// Pokreni HTTP i WebSocket server na portu 8080
server.listen(8080, () => {
  console.log("WebSocket server listening on port 8080");
});
