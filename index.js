const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
const express = require("express");
const fs = require("fs");

// ===== WEB SERVER =====
const app = express();
app.get("/", (req, res) => res.send("Bot online!"));
app.listen(3000, () => console.log("🌐 Web server ativo"));

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===== CONFIG =====
const CONFIG = {
  categorias: {
    lojas: "1479629713570926695",
    leilao: "1480908242908483676",
    parcerias: "1479629722685145181",
  },
  canais: {
    anuncios: "1479629789865312360",
  },
  logs: {
    geral: "1488129344537759786",
    parceria: "1487910575370403870",
  },
  staff: "1487928527952023562",
  punicaoTempo: 10 * 60 * 1000,
};

// ===== CARGOS =====
const CARGOS = {
  vendedor: {
    basic: "1488130676434796688",
    extra: "1488130541021565011",
  },
  leilao: {
    basic: "1488129747333419071",
    extra: "1488130140541030481",
  },
  parceria: {
    basic: "1488190263108309093",
    plus: "1488190254337888376",
    extra: "1488190243319447582",
  },
};

// ===== DADOS =====
let contadores = {};
let canaisLogs = {};

// 🔥 CARREGAR JSON (CORREÇÃO)
try {
  if (fs.existsSync("dados.json")) {
    contadores = JSON.parse(fs.readFileSync("dados.json"));
  }
} catch (err) {
  console.log("Erro ao carregar dados.json:", err.message);
  contadores = {};
}

// ===== SALVAR =====
function salvar() {
  try {
    fs.writeFileSync("dados.json", JSON.stringify(contadores, null, 2));
  } catch (err) {
    console.log("Erro ao salvar dados:", err.message);
  }
}
setInterval(salvar, 30000);

// ===== DETECTAR PING =====
function temPing(message) {
  return message.mentions.everyone || message.mentions.roles.size > 0;
}

// ===== LIMITES =====
function getLimite(member, tipo) {
  if (!member) return 0;

  if (tipo === "loja") {
    if (member.roles.cache.has(CARGOS.vendedor.extra)) return 3;
    if (member.roles.cache.has(CARGOS.vendedor.basic)) return 2;
  }

  if (tipo === "anuncio") {
    if (member.roles.cache.has(CARGOS.vendedor.extra)) return 2;
    if (member.roles.cache.has(CARGOS.vendedor.basic)) return 1;
  }

  if (tipo === "leilao") {
    if (member.roles.cache.has(CARGOS.leilao.extra)) return 3;
    if (member.roles.cache.has(CARGOS.leilao.basic)) return 1;
  }

  if (tipo === "parceria") {
    if (member.roles.cache.has(CARGOS.parceria.extra)) return 2;
    if (member.roles.cache.has(CARGOS.parceria.plus)) return 2;
    if (member.roles.cache.has(CARGOS.parceria.basic)) return 1;
  }

  return 0;
}

// ===== PROCESSAR =====
async function processarPing(message) {
  const member = message.member;
  if (!member || !message.channel.parentId) return;

  if (member.roles.cache.has(CONFIG.staff)) return;

  let tipo = null;

  if (message.channel.id === CONFIG.canais.anuncios) tipo = "anuncio";
  else if (message.channel.parentId === CONFIG.categorias.lojas) tipo = "loja";
  else if (message.channel.parentId === CONFIG.categorias.leilao) tipo = "leilao";
  else if (message.channel.parentId === CONFIG.categorias.parcerias) tipo = "parceria";

  if (!tipo) return;

  const limite = getLimite(member, tipo);
  if (limite === 0) return;

  const key = `${message.author.id}_${tipo}`;
  contadores[key] = (contadores[key] || 0) + 1;

  if (contadores[key] === limite) {
    message.reply("⚠️ Você atingiu o limite de pings!");
  }

  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("📢 Ping Detectado")
    .addFields(
      { name: "👤 Usuário", value: `${message.author}`, inline: true },
      { name: "📁 Tipo", value: tipo, inline: true },
      { name: "📊 Uso", value: `${contadores[key]}/${limite}`, inline: true }
    )
    .setTimestamp();

  let canalDestino =
    tipo === "parceria" ? canaisLogs.parceria : canaisLogs.geral;

  if (canalDestino) {
    canalDestino.send({ embeds: [embed] }).catch(() => {});
  }

  if (contadores[key] > limite) {
    try {
      if (
        member.moderatable &&
        message.guild.members.me.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        await member.timeout(CONFIG.punicaoTempo);
        message.reply("⛔ Você foi mutado por excesso de pings!");
      }
    } catch (err) {
      console.log("Erro ao punir:", err.message);
    }
  }
}

// ===== READY =====
client.once("clientReady", async () => {
  console.log(`✅ ${client.user.tag} online`);

  try {
    canaisLogs.geral = await client.channels.fetch(CONFIG.logs.geral);
    canaisLogs.parceria = await client.channels.fetch(CONFIG.logs.parceria);
  } catch {
    console.log("Erro ao carregar canais de log");
  }
});

// ===== COMANDOS =====
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content.toLowerCase() === "!pings") {
    const member = message.member;
    let resposta = "";

    ["loja", "anuncio", "leilao", "parceria"].forEach((tipo) => {
      const limite = getLimite(member, tipo);
      if (limite > 0) {
        const usado = contadores[`${message.author.id}_${tipo}`] || 0;
        resposta += `📊 ${tipo}: ${usado}/${limite}\n`;
      }
    });

    if (!resposta) {
      return message.reply("❌ Você não possui cargos válidos.");
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#00ff88")
          .setTitle("📊 Seus Pings")
          .setDescription(resposta)
          .setTimestamp(),
      ],
    });
  }

  if (!temPing(message)) return;

  processarPing(message);
});

// ===== ANTI-CRASH =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ===== LOGIN =====
client.login(process.env.TOKEN);
