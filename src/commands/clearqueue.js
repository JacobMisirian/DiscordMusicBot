const queue = require("../queue");

module.exports = {
  name: "clearqueue",
  description: "Clears the entire song queue.",
  async execute(client, interaction) {
    const songs = queue.getSongs();
    if (songs.length === 0) {
      await interaction.reply("The queue is already empty.");
      return;
    }
    queue.clear();
    await interaction.reply("The queue has been cleared.");
  },
};
