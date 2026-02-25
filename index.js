const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  StringSelectMenuBuilder
} = require("discord.js");

const express = require("express");
const fs = require("fs-extra");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot online 🚀"));
app.listen(PORT);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`Bot logado como ${client.user.tag}`);
});

// ================= PAINEL FIXO =================

client.on("messageCreate", async (message) => {

  if (!message.member.permissions.has("Administrator")) return;

  if (message.content === "!painelticket") {

    const canalPermitido = "📫・tickets";

    if (message.channel.name !== canalPermitido) {
      return message.reply("Use esse comando no canal 📫・tickets.");
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select_ticket")
      .setPlaceholder("Selecione o tipo de atendimento")
      .addOptions([
        { label: "Compra", value: "compra", emoji: "🛒" },
        { label: "Suporte", value: "suporte", emoji: "🎫" },
        { label: "Parceria", value: "parceria", emoji: "🤝" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const painel = await message.channel.send({
      embeds: [{
        title: "🎟️ Central de Atendimento",
        description: "Escolha abaixo o tipo de atendimento.",
        color: 0x2b2d31
      }],
      components: [row]
    });

    await painel.pin();
    message.delete();
  }

  if (message.content === "!loja") {

    const botao = new ButtonBuilder()
      .setCustomId("comprar_vip")
      .setLabel("🛒 Comprar VIP - R$10")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    message.channel.send({
      content: "🛍️ Loja Oficial\nClique abaixo para comprar VIP.",
      components: [row]
    });
  }

});

// ================= INTERAÇÕES =================

client.on(Events.InteractionCreate, async (interaction) => {

  // ===== CRIAR TICKET =====
  if (interaction.isStringSelectMenu() && interaction.customId === "select_ticket") {

    await interaction.deferReply({ ephemeral: true });

    const categoria = interaction.guild.channels.cache.find(
      c => c.name === "TICKETS" && c.type === ChannelType.GuildCategory
    );

    if (!categoria) {
      return interaction.editReply({ content: "Categoria TICKETS não encontrada." });
    }

    const tipo = interaction.values[0];

    const canal = await interaction.guild.channels.create({
      name: `${tipo}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoria.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const fechar = new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("❌ Fechar Ticket")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(fechar);

    await canal.send({
      content: `Olá ${interaction.user} 👋\nExplique seu pedido.`,
      components: [row]
    });

    const logs = interaction.guild.channels.cache.find(c => c.name === "logs-tickets");
    if (logs) logs.send(`🎟️ Ticket criado (${tipo}) por ${interaction.user}`);

    await interaction.editReply({ content: `✅ Ticket criado: ${canal}` });
  }

  // ===== FECHAR TICKET =====
  if (interaction.isButton() && interaction.customId === "fechar_ticket") {

    await interaction.deferReply({ ephemeral: true });

    const mensagens = await interaction.channel.messages.fetch({ limit: 100 });

    const transcript = mensagens
      .reverse()
      .map(m => `<p><strong>${m.author.tag}:</strong> ${m.content}</p>`)
      .join("");

    const html = `
      <html>
      <head><meta charset="UTF-8"><title>Transcript</title></head>
      <body>
      <h2>Transcript do Ticket</h2>
      ${transcript}
      </body>
      </html>
    `;

    const caminho = `./transcript-${interaction.channel.id}.html`;
    await fs.writeFile(caminho, html);

    const logs = interaction.guild.channels.cache.find(c => c.name === "logs-tickets");

    if (logs) {
      await logs.send({
        content: `🧾 Transcript do ticket ${interaction.channel.name}`,
        files: [caminho]
      });
    }

    await interaction.editReply({ content: "🔒 Ticket fechado." });

    setTimeout(async () => {
      await interaction.channel.delete();
      await fs.remove(caminho);
    }, 3000);
  }

  // ===== LOJA VIP =====
  if (interaction.isButton() && interaction.customId === "comprar_vip") {

    await interaction.deferReply({ ephemeral: true });

    const cargo = interaction.guild.roles.cache.find(r => r.name === "VIP");
    const logs = interaction.guild.channels.cache.find(c => c.name === "logs-vendas");

    if (!cargo) {
      return interaction.editReply({ content: "❌ Cargo VIP não encontrado." });
    }

    await interaction.member.roles.add(cargo);

    if (logs) {
      logs.send(`🛒 Nova venda\nCliente: ${interaction.user}\nProduto: VIP\nValor: R$10`);
    }

    await interaction.editReply({
      content: "✅ Compra aprovada! Você recebeu o cargo VIP."
    });
  }

});

client.login(process.env.DISCORD_TOKEN);
