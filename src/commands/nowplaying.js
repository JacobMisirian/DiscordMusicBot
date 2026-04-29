const queue = require("../queue");

module.exports = {
  name: "nowplaying",
  description: "Shows the currently playing song.",
  async execute(client, interaction) {
    const currentSong = queue.getCurrentSong();
    if (!currentSong) {
      await interaction.reply({
        content: "There is no song currently playing.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(
      `Now playing: ${currentSong.toString()}${currentSong.paused ? " (paused)" : ""}${currentSong.stopped ? " (stopped)" : ""}.`,
    );
  },
};
