const queue = require("../queue");

module.exports = {
  name: "remove",
  description: "Removes a song from the queue by its position.",
  arguments: [
    {
      name: "position",
      type: "INTEGER",
      description: "The position of the song to remove (1-based index).",
      required: true,
    },
  ],
  async execute(client, interaction) {
    const position = interaction.options.getInteger("position");
    if (position === null || position < 1) {
      await interaction.reply({
        content: "Please provide a valid song position (1 or higher).",
        ephemeral: true,
      });
      return;
    }
    const songToRemove = queue.getSongAt(position - 1);
    if (!songToRemove) {
      await interaction.reply({
        content: `There is no song at position ${position} in the queue.`,
        ephemeral: true,
      });
      return;
    }
    if (songToRemove === queue.getCurrentSong() && !songToRemove.stopped) {
      await interaction.reply({
        content:
          "You cannot remove the currently playing song. Use /skip to skip it instead.",
        ephemeral: true,
      });
      return;
    }
    queue.removeAt(position - 1);
    await interaction.reply({
      content: `Removed **${songToRemove.title}** from the queue.`,
    });
  },
};
