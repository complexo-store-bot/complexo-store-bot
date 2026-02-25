const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Servidor obrigatório pro Render
app.get("/", (req, res) => {
  res.send("Bot online 🚀");
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Bot logado como ${client.user.tag}`);
});

// COMANDO PARA ABRIR LOJA
client.on("messageCreate", async (message) => {
  if (message.content === "!loja") {

    const botao = new ButtonBuilder()
      .setCustomId("comprar_vip")
      .setLabel("🛒 Comprar VIP - R$10")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    message.channel.send({
      content: "🛍️ **LOJA OFICIAL**\nClique abaixo para comprar VIP.",
      components: [row]
    });
  }
});

// INTERAÇÃO DE COMPRA
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "comprar_vip") {

    const cargo = interaction.guild.roles.cache.find(r => r.name === "VIP");
    const canalLogs = interaction.guild.channels.cache.find(c => c.name === "logs-vendas");

    if (!cargo) {
      return interaction.reply({ content: "❌ Cargo VIP não encontrado.", ephemeral: true });
    }

    await interaction.member.roles.add(cargo);

    await interaction.reply({
      content: "✅ Compra aprovada! Você recebeu o cargo VIP.",
      ephemeral: true
    });

    if (canalLogs) {
      canalLogs.send(`🛒 Nova venda!\nCliente: ${interaction.user}\nProduto: VIP\nValor: R$10`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
