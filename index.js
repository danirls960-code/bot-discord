const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// ===== WEB SERVER =====
const app = express();
app.get("/", (req, res) => res.send("Bot online!"));
app.listen(3000, () => console.log("Web server ativo"));

// ===== DISCORD BOT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
