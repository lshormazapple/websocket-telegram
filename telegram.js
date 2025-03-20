const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require("fs");
const input = require("input");
const { apiId, apiHash, sessionFile, sessionString } = require("./config");

let session = new StringSession(sessionString || "");  // Using sessionString from config.js

const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

async function startTelegramClient() {
  try {
    if (!sessionString) {
      console.log("🔑 First-time login required.");
      await client.start({
        phoneNumber: async () => {
          return await input.text("Enter your phone number: ");
        },
        password: async () => {
          return await input.text("Enter your 2FA password (if applicable): ");
        },
        phoneCode: async () => {
          return await input.text("Enter the code from Telegram: ");
        },
        onError: async (err) => {
          console.log(err.message);
        },
      });

      // Save session to file
      fs.writeFileSync(sessionFile, client.session.save(), "utf8");
      console.log("✅ Session saved!");
    } else {
      try {
        await client.connect();
        console.log("✅ Loaded existing session.");
      } catch (error) {
        if (error.message === "AUTH_KEY_DUPLICATED") {
          console.log("Auth key duplicated, deleting session and relogging");
          fs.unlinkSync(sessionFile);  // Delete the existing session file
          session = new StringSession("");  // Reset session
          await startTelegramClient();  // Restart the login process
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("Error during Telegram client startup:", error);
  }
}

startTelegramClient();  // Call the function to start the login or session loading process

module.exports = { client, startTelegramClient };
