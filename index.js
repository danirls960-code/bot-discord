const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// ===== WEB SERVER (OBRIGATÓRIO PRO RENDER) =====
const app = express();

app.get("/", (req, res) => {
  res.send("Bot online!");
});

// PORTA DINÂMICA DO RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🌐 Web server ativo na porta " + PORT);
});

// ===== DISCORD BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

client.once("ready", () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

// LOGIN COM TOKEN
client.login(process.env.TOKEN);
