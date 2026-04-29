const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

module.exports = {
  name: "join",
  description: "Joins the user's voice channel.",
  async execute(client, interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply({
        content: "You need to be in a voice channel to use this command.",
        ephemeral: true,
      });
      return;
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: true,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      await interaction.reply(`Joined ${voiceChannel.name}!`);
    } catch (error) {
      console.error("Error joining voice channel:", error);
      await interaction.reply({
        content: "There was an error trying to join the voice channel.",
        ephemeral: true,
      });
    }
  },
};
