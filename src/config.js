const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  INACTIVITY_TIMEOUT_MS: parseInt(process.env.INACTIVITY_TIMEOUT_MS) || 300000,
};
