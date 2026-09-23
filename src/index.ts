import "dotenv/config";
import cron from "node-cron";
import {
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { scrapeShop, ShopSnapshot } from "./shop.js";
import { getSubscriptions, loadState, markPosted, subscribe, unsubscribe } from "./store.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const developmentGuildId = process.env.DISCORD_GUILD_ID;
const shopUrl = process.env.SHOP_URL ?? "https://rlshop.gg/";

if (!token || !clientId) {
  throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID must be set");
}

const commands = [
  new SlashCommandBuilder().setName("shop").setDescription("Show the current Rocket League item shop"),
  new SlashCommandBuilder()
    .setName("subscribe")
    .setDescription("Post new daily shops in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("unsubscribe")
    .setDescription("Stop daily shop posts in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((command) => command.toJSON());

function buildShopEmbeds(shop: ShopSnapshot): EmbedBuilder[] {
  const lines = shop.items.map((item) => {
    const variant = item.paint ? ` (${item.paint})` : "";
    return `**${item.name}${variant}**\n${item.category} | ${item.price.toLocaleString()} Credits`;
  });
  const chunks: string[][] = [];

  for (let index = 0; index < lines.length; index += 12) {
    chunks.push(lines.slice(index, index + 12));
  }

  return chunks.map((chunk, index) => {
    const embed = new EmbedBuilder()
      .setColor(0x2499e3)
      .setDescription(chunk.join("\n\n"))
      .setURL(shop.sourceUrl);

    if (index === 0) {
      embed
        .setTitle("Today's Rocket League Item Shop")
        .setThumbnail(shop.items[0]?.imageUrl ?? null)
        .setFooter({ text: "Data scraped from rlshop.gg" })
        .setTimestamp(new Date(shop.scrapedAt));
    }

    return embed;
  });
}

async function postChangedShop(): Promise<void> {
  const subscriptions = Object.entries(getSubscriptions());
  if (subscriptions.length === 0) {
    return;
  }

  const shop = await scrapeShop(shopUrl);
  for (const [guildId, subscription] of subscriptions) {
    if (subscription.lastShopHash === shop.hash) {
      continue;
    }

    try {
      const channel = await client.channels.fetch(subscription.channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        console.error(`Configured channel ${subscription.channelId} is unavailable`);
        continue;
      }
      await (channel as TextChannel).send({ embeds: buildShopEmbeds(shop) });
      await markPosted(guildId, shop.hash);
    } catch (error) {
      console.error(`Failed to post shop for guild ${guildId}`, error);
    }
  }
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.commandName === "shop") {
    await interaction.deferReply();
    const shop = await scrapeShop(shopUrl);
    await interaction.editReply({ embeds: buildShopEmbeds(shop) });
    return;
  }

  if (!interaction.guildId || !interaction.channelId) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  if (interaction.commandName === "subscribe") {
    await subscribe(interaction.guildId, interaction.channelId);
    await interaction.reply({ content: "Daily shop posts will be sent in this channel.", ephemeral: true });
    return;
  }

  const removed = await unsubscribe(interaction.guildId);
  await interaction.reply({
    content: removed ? "Daily shop posts are disabled." : "This server was not subscribed.",
    ephemeral: true,
  });
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);
  await postChangedShop().catch((error) => console.error("Initial shop check failed", error));
  cron.schedule("*/10 * * * *", () => {
    void postChangedShop().catch((error) => console.error("Scheduled shop check failed", error));
  });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  await handleCommand(interaction).catch(async (error) => {
    console.error("Command failed", error);
    const message = { content: "The shop could not be loaded. Please try again shortly.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(message);
    } else {
      await interaction.reply(message);
    }
  });
});

await loadState();
const rest = new REST().setToken(token);
const route = developmentGuildId
  ? Routes.applicationGuildCommands(clientId, developmentGuildId)
  : Routes.applicationCommands(clientId);
await rest.put(route, { body: commands });
await client.login(token);