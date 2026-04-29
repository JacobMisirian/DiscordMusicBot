const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const config = require("./config");
const queue = require("./queue");
const { getActiveConnection } = require("./voiceManager");

const commandModules = require("fs")
  .readdirSync("./src/commands")
  .filter((file) => file.endsWith(".js"))
  .map((file) => require(`./commands/${file}`));

const commands = commandModules
  .filter(
    (cmd) =>
      typeof cmd.name === "string" && typeof cmd.description === "string",
  )
  .map((cmd) => {
    const builder = new SlashCommandBuilder()
      .setName(cmd.name)
      .setDescription(cmd.description);

    if (Array.isArray(cmd.arguments)) {
      cmd.arguments.forEach((arg) => {
        if (arg.type === "STRING") {
          builder.addStringOption((option) =>
            option
              .setName(arg.name)
              .setDescription(arg.description)
              .setRequired(Boolean(arg.required)),
          );
        }
        if (arg.type === "INTEGER") {
          builder.addIntegerOption((option) =>
            option
              .setName(arg.name)
              .setDescription(arg.description)
              .setRequired(Boolean(arg.required)),
          );
        }
      });
    }

    return builder.toJSON();
  });

if (commands.length !== commandModules.length) {
  console.warn(
    "Some command modules were skipped because name/description are missing or invalid.",
  );
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const rest = new REST({ version: "10" }).setToken(config.BOT_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      { body: commands },
    );

    console.log(`Connected to guild: ${guild.name} (${guild.id})`);
    console.log(`Registered ${commands.length} guild slash command(s).`);
  } catch {
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${config.CLIENT_ID}&scope=bot%20applications.commands&permissions=3148800`;
    console.error(
      `Bot is logged in but is not in the configured guild ${config.GUILD_ID}.`,
    );
    console.error(`Invite it with: ${inviteUrl}`);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  try {
    const command = require(`./commands/${commandName}`);
    await command.execute(client, interaction);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    await interaction.reply({
      content: "There was an error while executing this command.",
      ephemeral: true,
    });
  }
});

client.login(config.BOT_TOKEN).catch((err) => {
  console.error("Failed to login:", err.message);
});

let lastTimePlayerWasActive = Date.now();

setInterval(() => {
  const connection = getActiveConnection();
  if (!connection) {
    return;
  }

  const currentSong = queue.getCurrentSong();
  if (currentSong && !currentSong.stopped) {
    lastTimePlayerWasActive = Date.now();
  }

  if (Date.now() - lastTimePlayerWasActive > config.INACTIVITY_TIMEOUT_MS) {
    console.log(
      "No activity detected for a while. Stopping player and clearing queue.",
    );
    queue.clear();
    connection.destroy();
  }
}, 1000);
