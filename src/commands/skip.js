const { AudioPlayerStatus } = require("@discordjs/voice");
const queue = require("../queue");
const { getActiveConnection } = require("../voiceManager");

module.exports = {
  name: "skip",
  description: "Skips the currently playing song.",
  async execute(client, interaction) {
    const currentSong = queue.getCurrentSong();
    if (!currentSong) {
      await interaction.reply("There is no song currently playing.");
      return;
    }

    const connection = getActiveConnection();
    if (!connection) {
      await interaction.reply({
        content: "Not connected to a voice channel.",
        ephemeral: true,
      });
      return;
    }

    currentSong.stop();
    queue.skip();

    const nextSong = queue.getCurrentSong();
    if (nextSong) {
      await nextSong.playSongInDiscord(client, connection);
      nextSong.player.once(AudioPlayerStatus.Idle, async () => {
        if (nextSong.stopped) return;
        queue.skip();
        const after = queue.getCurrentSong();
        if (after) {
          await after.playSongInDiscord(client, connection);
        }
      });
      await interaction.reply(`Skipped to: **${nextSong.title}**`);
    } else {
      await interaction.reply(
        `Skipped: **${currentSong.title}**. Queue is now empty.`,
      );
    }
  },
};
