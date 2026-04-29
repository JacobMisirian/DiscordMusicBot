const {
  joinVoiceChannel,
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const { PermissionsBitField } = require("discord.js");

let activeConnection = null;

function getActiveConnection() {
  return activeConnection;
}

async function cleanupStaleVoiceSession(guild) {
  const guildId = guild.id;
  const liveGuild = await guild.client.guilds.fetch(guildId, { force: true });
  const me = liveGuild.members.me || (await liveGuild.members.fetchMe());
  const currentChannelId = me?.voice?.channelId;
  const existingConnection = getVoiceConnection(guildId);
  const canMoveMembers = me?.permissions?.has(
    PermissionsBitField.Flags.MoveMembers,
  );

  if (!currentChannelId && !existingConnection) {
    return;
  }

  if (existingConnection) {
    existingConnection.destroy();
  }

  if (currentChannelId && canMoveMembers) {
    await me.voice.disconnect();
  } else if (currentChannelId) {
    console.warn(
      "Bot appears to still be in a voice channel, but lacks Move Members permission to force-disconnect itself.",
    );
  }

  if (currentChannelId || existingConnection) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  activeConnection = null;
}

async function connectToVoiceChannel(guild, voiceChannel) {
  const guildId = guild.id;
  await cleanupStaleVoiceSession(guild);

  const createConnection = async () => {
    const liveGuild = await guild.client.guilds.fetch(guildId, { force: true });
    const adapterCreator = liveGuild.voiceAdapterCreator;

    if (!adapterCreator) {
      const adapterError = new Error(
        "Voice adapter unavailable for this guild.",
      );
      adapterError.code = "VOICE_ADAPTER_UNAVAILABLE";
      throw adapterError;
    }

    return joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
  };

  let connection = getVoiceConnection(guildId);
  if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
    if (connection) {
      connection.destroy();
    }
    connection = await createConnection();
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    const onStateChange = (oldState, newState) => {
      console.log(
        `Voice state transition (attempt ${attempt}): ${oldState.status} -> ${newState.status}`,
      );
    };

    connection.on("stateChange", onStateChange);
    const rejoinTicker = setInterval(() => {
      if (
        connection.state.status === VoiceConnectionStatus.Signalling ||
        connection.state.status === VoiceConnectionStatus.Connecting
      ) {
        console.warn(
          `Voice still ${connection.state.status} on attempt ${attempt}; sending rejoin()`,
        );
        connection.rejoin();
      }
    }, 4500);

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
      clearInterval(rejoinTicker);
      connection.off("stateChange", onStateChange);
      activeConnection = connection;
      return connection;
    } catch (error) {
      clearInterval(rejoinTicker);
      connection.off("stateChange", onStateChange);
      console.warn(
        `Voice ready attempt ${attempt} failed with state ${connection.state.status}`,
      );

      if (attempt === 3) {
        error.code = "VOICE_CONNECTION_TIMEOUT";
        throw error;
      }

      connection.destroy();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      connection = await createConnection();
    }
  }

  const timeoutError = new Error("Voice connection failed to become ready.");
  timeoutError.code = "VOICE_CONNECTION_TIMEOUT";
  throw timeoutError;
}

module.exports = { connectToVoiceChannel, getActiveConnection };
