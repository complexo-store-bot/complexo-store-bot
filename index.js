const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  StringSelectMenuBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const express = require("express");
const fs = require("fs-extra");

const CHAVE_PIX = "455cb83a-ce97-471e-954f-2f1922bbbc73";

const app = express();
app.get("/", (req, res) => res.send("Bot online 🚀"));
app.listen(3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

const produtosPath = "./produtos.json";

function carregarProdutos() {
  return JSON.parse(fs.readFileSync(produtosPath));
}

function salvarProdutos(produtos) {
  fs.writeFileSync(produtosPath, JSON.stringify(produtos, null, 2));
}

/* ================= REGISTRAR SLASH ================= */

client.once('ready', () => {

  client.user.setActivity(
    "Nitros, streamings e robux com sorteios toda a semana!",
    {
      type: 1,
      url: "https://twitch.tv/SEU_CANAL"
    }
  );

});

  const commands = [
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Verifica se o bot está online"),

    new SlashCommandBuilder()
      .setName("painelticket")
      .setDescription("Cria painel de ticket"),

    new SlashCommandBuilder()
      .setName("painelvendas")
      .setDescription("Cria painel da loja"),

    new SlashCommandBuilder()
      .setName("estoque")
      .setDescription("Ver estoque (Admin)")
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Slash commands registrados.");
});

/* ================= INTERAÇÕES ================= */

client.on(Events.InteractionCreate, async (interaction) => {

  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;

  /* ===== SLASH COMMANDS ===== */

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "ping")
      return interaction.reply("🏓 Pong! Bot online.");

    if (interaction.commandName === "painelticket") {

      const menu = new StringSelectMenuBuilder()
        .setCustomId("abrir_ticket")
        .setPlaceholder("Selecione o tipo")
        .addOptions([
          { label: "Compra", value: "compra", emoji: "🛒" },
          { label: "Suporte", value: "suporte", emoji: "🎫" },
          { label: "Parceria", value: "parceria", emoji: "🤝" }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.reply({
        embeds: [{
          title: "🎟️ Central de Atendimento",
          description: "Escolha abaixo.",
          color: 0x2b2d31
        }],
        components: [row]
      });
    }

    if (interaction.commandName === "painelvendas") {

      const produtos = carregarProdutos();

      const menu = new StringSelectMenuBuilder()
        .setCustomId("comprar_produto")
        .setPlaceholder("Selecione o produto");

      Object.keys(produtos).forEach(key => {
        const p = produtos[key];
        menu.addOptions({
          label: `${p.nome} - R$${p.preco}`,
          description: p.estoque.length > 0 ? `Estoque: ${p.estoque.length}` : "❌ Esgotado",
          value: key
        });
      });

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.reply({
        embeds: [{
          title: "🛒 Loja Oficial",
          description: "Pagamento via PIX",
          color: 0x00ff99
        }],
        components: [row]
      });
    }

    if (interaction.commandName === "estoque") {

      if (!interaction.member.permissions.has("Administrator"))
        return interaction.reply({ content: "Apenas admin.", ephemeral: true });

      const produtos = carregarProdutos();
      let texto = "📦 Estoque Atual:\n\n";

      Object.keys(produtos).forEach(key => {
        texto += `${produtos[key].nome}: ${produtos[key].estoque.length}\n`;
      });

      return interaction.reply({ content: texto, ephemeral: true });
    }
  }

  /* ===== ABRIR TICKET ===== */

  if (interaction.isStringSelectMenu() && interaction.customId === "abrir_ticket") {

    await interaction.deferReply({ ephemeral: true });

    const categoria = interaction.guild.channels.cache.find(
      c => c.name === "⎯TICKET SUPPORT" && c.type === ChannelType.GuildCategory
    );

    const canal = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoria?.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    interaction.editReply({ content: `✅ Ticket criado: ${canal}` });
  }

  /* ===== COMPRA PIX ===== */

  if (interaction.isStringSelectMenu() && interaction.customId === "comprar_produto") {

    await interaction.deferReply({ ephemeral: true });

    const produtos = carregarProdutos();
    const key = interaction.values[0];
    const produto = produtos[key];

    if (!produto || produto.estoque.length === 0)
      return interaction.editReply({ content: "❌ Produto esgotado." });

    const categoria = interaction.guild.channels.cache.find(
      c => c.name === "⎯TICKET SUPPORT" && c.type === ChannelType.GuildCategory
    );

    const canal = await interaction.guild.channels.create({
      name: `venda-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoria?.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    const confirmar = new ButtonBuilder()
      .setCustomId(`confirmar_${key}`)
      .setLabel("✅ Confirmar (Admin)")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(confirmar);

    await canal.send({
      content:
`🛍️ Produto: ${produto.nome}
💰 Valor: R$${produto.preco}

💳 Chave PIX:
${CHAVE_PIX}

Envie comprovante e aguarde confirmação.`,
      components: [row]
    });

    interaction.editReply({ content: `🧾 Canal criado: ${canal}` });
  }

  /* ===== CONFIRMAR ===== */

  if (interaction.isButton() && interaction.customId.startsWith("confirmar_")) {

    if (!interaction.member.permissions.has("Administrator"))
      return interaction.reply({ content: "Apenas admin.", ephemeral: true });

    const key = interaction.customId.replace("confirmar_", "");
    const produtos = carregarProdutos();
    const produto = produtos[key];

    if (!produto || produto.estoque.length === 0)
      return interaction.reply({ content: "Sem estoque.", ephemeral: true });

    const item = produto.estoque.shift();
    salvarProdutos(produtos);

    const userId = interaction.channel.permissionOverwrites.cache
      .find(p => p.allow.has(PermissionsBitField.Flags.ViewChannel) && p.id !== interaction.guild.id)?.id;

    if (userId) {
      const membro = await interaction.guild.members.fetch(userId);
      await membro.send(`✅ Pagamento confirmado!\n\n${produto.nome}\n\n${item}`);
    }

    await interaction.reply({ content: "Produto entregue!", ephemeral: true });
  }

});

client.login(process.env.DISCORD_TOKEN);
