const queue = require("../queue");

module.exports = {
  name: "resume",
  description: "Resumes the currently paused song.",
  async execute(client, interaction) {
    const currentSong = queue.getCurrentSong();
    if (!currentSong) {
      await interaction.reply({
        content: "There is no song currently playing.",
        ephemeral: true,
      });
      return;
    }

    if (!currentSong.paused) {
      await interaction.reply({
        content: "The current song is not paused.",
        ephemeral: true,
      });
      return;
    }
    currentSong.resume();
    await interaction.reply({
      content: `Resuming **${currentSong.title}**.`,
    });
  },
};
