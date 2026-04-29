const { Innertube } = require("youtubei.js");
const queue = require("../queue");
const Song = require("../song");

function getRequestedByName(interaction) {
  return (
    interaction.member?.displayName ||
    interaction.member?.nickname ||
    interaction.user.globalName ||
    interaction.user.username
  );
}

function extractPlaylistId(input) {
  try {
    const url = new URL(input);
    return url.searchParams.get("list") || null;
  } catch {
    return null;
  }
}

module.exports = {
  name: "queueplaylist",
  description: "Queues a playlist of songs from a YouTube URL.",
  arguments: [
    {
      name: "url",
      type: "STRING",
      description: "The URL of the YouTube playlist to queue.",
      required: true,
    },
  ],
  async execute(client, interaction) {
    const url = interaction.options.getString("url");
    if (!url) {
      await interaction.reply("Please provide a YouTube playlist URL.");
      return;
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      await interaction.reply({
        content:
          "Invalid YouTube playlist URL — make sure it contains a `list=` parameter.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const yt = await Innertube.create();
      const playlist = await yt.getPlaylist(playlistId);

      const items = playlist?.items ?? [];
      if (items.length === 0) {
        await interaction.editReply(
          "The playlist is empty or could not be loaded.",
        );
        return;
      }

      let needToStartPlayer = queue.getCurrentSong() === null;
      let added = 0;
      const requestedBy = getRequestedByName(interaction);
      for (const video of items) {
        const videoId = video.id;
        if (!videoId) continue;
        const title =
          typeof video.title?.text === "string"
            ? video.title.text
            : (video.title?.toString?.() ?? `https://youtu.be/${videoId}`);
        const duration = video.duration?.seconds ?? null;
        queue.enqueue(
          new Song({
            title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            requestedBy,
            duration,
          }),
        );
        added++;
      }

      await interaction.editReply(
        `Queued **${added}** song${added !== 1 ? "s" : ""} from the playlist.`,
      );

      if (needToStartPlayer) {
        console.log("Starting player for newly queued playlist...");
        let connection = require("../voiceManager").getActiveConnection();
        if (!connection) {
          const voiceChannel = interaction.member?.voice?.channel;
          connection = await require("../voiceManager").connectToVoiceChannel(
            interaction.guild,
            voiceChannel,
          );
        }
        const nextSong = queue.getCurrentSong();
        if (nextSong) {
          await nextSong.playSongInDiscord(client, connection);
          nextSong.player.once("idle", async () => {
            if (nextSong.stopped) return;
            queue.skip();
            const after = queue.getCurrentSong();
            if (after) {
              await after.playSongInDiscord(client, connection);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error queuing playlist:", error);
      await interaction.editReply(
        "There was an error loading the playlist. Make sure it is public.",
      );
    }
  },
};
