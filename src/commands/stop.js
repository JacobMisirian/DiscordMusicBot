const queue = require("../queue");

module.exports = {
  name: "stop",
  description: "Stops playback",
  async execute(client, interaction) {
    const currentSong = queue.getCurrentSong();
    if (!currentSong) {
      await interaction.reply({
        content: "There is no song currently playing.",
        ephemeral: true,
      });
      return;
    }

    currentSong.stop();
    await interaction.reply(`Stopped playback.`);
  },
};
