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
      .map((song, index) => `**${index + 1}**. ${song.toString()}`)
      .join("\n");
    // Discord messages have a maximum length of 2000 characters, so we may need to truncate the list
    const maxMessageLength = 2000;
    let truncated = false;
    let displayedSongList = songList;
    if (songList.length > maxMessageLength) {
      displayedSongList =
        songList.slice(0, maxMessageLength - 100) + "\n... (truncated)";
      truncated = true;
    }

    await interaction.reply(`Queue:\n${displayedSongList}`);
  },
};
