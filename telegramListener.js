const { client } = require("./telegram");
const WebSocket = require("ws");

const TARGET_PEER_ID = "2320489201";
const codeRegex = /\b[A-Z]{8}\b|\b[A-Z0-9]{8}\b/g;

const ws = new WebSocket("wss://my-app.up.railway.app");

ws.on("open", () => {
    console.log("✅ Connected to WebSocket server.");
});

ws.on("error", (err) => {
    console.error("WebSocket error:", err);
});

client.addEventHandler(async (event) => {
    if (!event.message) return; 
    
    const message = event.message;
    const messagePeerId =
        message.peerId?.channelId?.toString() ||
        message.peerId?.userId?.toString();

    if (messagePeerId !== TARGET_PEER_ID) return;
    ws.send(JSON.stringify({ type: "message", message: message.message }));
    const match = message.message.match(codeRegex);
    if (match) {
        for (const code of match) {
            console.log(`📤 Sending code to WebSocket: ${code}`);
            ws.send(JSON.stringify({ type: "new_code", code }));
        }
    }
});
