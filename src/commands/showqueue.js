const queue = require("../queue");

module.exports = {
  name: "showqueue",
  description: "Lists the songs currently in the queue.",
  async execute(client, interaction) {
    const songs = queue.getSongs();
    if (songs.length === 0) {
      await interaction.reply("The queue is currently empty.");
      return;
    }
    const songList = songs
      .map((song, index) => `${index + 1}. ${song.toString()}`)
      .join("\n");
    await interaction.reply(`Current Queue:\n${songList}`);
  },
};
