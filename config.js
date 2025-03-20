const fs = require("fs");

const sessionFile = "session.json";
const apiId = 26147178;
const apiHash = "90be2030e5d32802de8f3170d71fac5d";

const sessionString = fs.existsSync(sessionFile) ? fs.readFileSync(sessionFile, "utf8") : "";

module.exports = {
  sessionFile,
  apiId,
  apiHash,
  sessionString,
};
