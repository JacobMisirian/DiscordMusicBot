const queue = require("../queue");

module.exports = {
  name: "pause",
  description: "Pauses the currently playing song.",
  async execute(client, interaction) {
    const currentSong = queue.getCurrentSong();
    if (!currentSong) {
      await interaction.reply({
        content: "There is no song currently playing.",
        ephemeral: true,
      });
      return;
    }
    if (currentSong.paused) {
      await interaction.reply({
        content:
          "The current song is already paused. Use /resume to continue playing.",
        ephemeral: true,
      });
      return;
    }
    currentSong.pause();
    await interaction.reply({
      content: `Paused **${currentSong.title}**.`,
    });
  },
};
