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
    const songList = songs.map(
      (song, index) => `**${index + 1}**. ${song.toString()}`,
    );

    let displayedSongList = "";
    for (const songEntry of songList) {
      if (displayedSongList.length + songEntry.length + 30 > 2000) {
        displayedSongList += `...and ${songList.length - displayedSongList.split("\n").length} more.`;
        break;
      }
      displayedSongList += `${songEntry}\n`;
    }

    await interaction.reply(`Queue:\n${displayedSongList}`);
  },
};
