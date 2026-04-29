const { AudioPlayerStatus } = require("@discordjs/voice");
const { PermissionsBitField } = require("discord.js");
const queue = require("../queue");
const { Innertube } = require("youtubei.js");
const ytdl = require("@distube/ytdl-core");
const config = require("../config");
const Song = require("../song");
const { connectToVoiceChannel } = require("../voiceManager");

const guildPlayers = new Map();
let ytClientPromise = null;

function getRequestedByName(interaction) {
  return (
    interaction.member?.displayName ||
    interaction.member?.nickname ||
    interaction.user.globalName ||
    interaction.user.username
  );
}

function extractYouTubeVideoId(input) {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1);
      return id || null;
    }

    if (host === "youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      if (
        url.pathname.startsWith("/shorts/") ||
        url.pathname.startsWith("/embed/")
      ) {
        const [, , id] = url.pathname.split("/");
        return id || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function playNextSongFromQueue(guild, connection) {
  // Remove the song that just finished and advance to the next queued item.
  queue.skip();
  const nextSong = queue.getSongs()[0];

  if (!nextSong) {
    guildPlayers.delete(guild.id);
    return;
  }

  guildPlayers.set(guild.id, nextSong);
  await nextSong.playSongInDiscord(guild.client, connection);

  nextSong.player.once(AudioPlayerStatus.Idle, async () => {
    if (nextSong.stopped) {
      return;
    }

    try {
      await playNextSongFromQueue(guild, connection);
    } catch (error) {
      console.error("Failed to play next queued song:", error);
      queue.skip();
      await playNextSongFromQueue(guild, connection);
    }
  });
}

async function getFirstResultFromYoutubeSearch(query) {
  try {
    if (!ytClientPromise) {
      ytClientPromise = Innertube.create();
    }
    const yt = await ytClientPromise;
    const searchResults = await yt.search(query, { type: "video" });
    const firstVideo = searchResults?.videos?.[0];
    if (!firstVideo) {
      throw new Error("No video results found");
    }
    return {
      url: `https://www.youtube.com/watch?v=${firstVideo.id}`,
      title:
        firstVideo.title?.text ||
        firstVideo.title?.toString?.() ||
        `https://youtu.be/${firstVideo.id}`,
    };
  } catch (error) {
    // Recreate the shared client if it became unusable.
    ytClientPromise = null;
    console.error("Error performing YouTube search:", error);
    throw new Error(
      "Failed to perform YouTube search. Please try again later.",
    );
  }
}

module.exports = {
  name: "play",
  description: "Plays a song in the user's voice channel.",
  arguments: [
    {
      name: "url_or_search",
      type: "STRING",
      description:
        "The URL of the song to play, or a search term (first result will play).",
      required: true,
    },
  ],
  async execute(client, interaction) {
    const urlOrSearch = interaction.options.getString("url_or_search");
    if (!urlOrSearch) {
      await interaction.reply({
        content: "Please provide a URL or search term.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    let songUrl;
    let searchTitle = null;
    if (
      urlOrSearch.startsWith("http://") ||
      urlOrSearch.startsWith("https://")
    ) {
      songUrl = urlOrSearch;
    } else {
      try {
        const searchResult = await getFirstResultFromYoutubeSearch(urlOrSearch);
        songUrl = searchResult.url;
        searchTitle = searchResult.title;
      } catch (error) {
        await interaction.editReply({
          content: error.message,
          ephemeral: true,
        });
        return;
      }
    }

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      await interaction.editReply({
        content: "Join a voice channel first, then run /play.",
        ephemeral: true,
      });
      return;
    }

    const me = interaction.guild?.members?.me;
    const perms = me ? voiceChannel.permissionsFor(me) : null;
    if (!perms?.has("Connect") || !perms?.has("Speak")) {
      await interaction.editReply({
        content: "I need Connect and Speak permissions in your voice channel.",
        ephemeral: true,
      });
      return;
    }

    try {
      const videoId = extractYouTubeVideoId(songUrl);
      if (!videoId) {
        await interaction.editReply({
          content:
            "Please provide a valid YouTube URL (watch, youtu.be, shorts, or embed).",
          ephemeral: true,
        });
        return;
      }

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`Fetching video info for ${videoUrl}...`);
      const alreadyPlaying = queue.length > 0;
      let title = searchTitle || `https://youtu.be/${videoId}`;
      let duration = null;

      try {
        const songInfo = await ytdl.getInfo(videoUrl);
        title = songInfo?.videoDetails?.title || title;
        const rawLength = songInfo?.videoDetails?.lengthSeconds;
        duration = rawLength ? parseInt(rawLength, 10) : null;
      } catch (primaryError) {
        console.warn(
          "Primary YouTube extractor failed; trying youtubei.js for title:",
          primaryError.message,
        );
        try {
          if (!ytClientPromise) {
            ytClientPromise = Innertube.create();
          }
          const innertube = await ytClientPromise;
          const basicInfo = await innertube.getBasicInfo(videoId);
          title =
            basicInfo?.basic_info?.title ||
            basicInfo?.video_details?.title ||
            basicInfo?.videoDetails?.title ||
            title;
          const rawLength = basicInfo?.basic_info?.duration;
          duration = rawLength ? Math.round(rawLength) : null;
        } catch (secondaryError) {
          ytClientPromise = null;
          console.warn(
            "youtubei.js title fetch failed:",
            secondaryError.message,
          );
        }
      }

      queue.enqueue(
        new Song({
          title,
          url: videoUrl,
          requestedBy: getRequestedByName(interaction),
          duration,
        }),
      );

      if (alreadyPlaying) {
        await interaction.editReply(
          `Added to queue: ${title} (position ${queue.length}). Use /showqueue to see the full queue.`,
        );
        return;
      }

      const connection = await connectToVoiceChannel(
        interaction.guild,
        voiceChannel,
      );

      const existingSong = guildPlayers.get(interaction.guild.id);
      if (existingSong) {
        existingSong.stop();
      }

      const song = queue.getSongs()[0];
      guildPlayers.set(interaction.guild.id, song);

      await song.playSongInDiscord(interaction.client, connection);
      song.player.once(AudioPlayerStatus.Idle, async () => {
        if (song.stopped) {
          return;
        }

        try {
          await playNextSongFromQueue(interaction.guild, connection);
        } catch (error) {
          console.error("Failed to play next queued song:", error);
          queue.skip();
          await playNextSongFromQueue(interaction.guild, connection);
        }
      });

      await interaction.editReply(`Now playing: ${title}`);
    } catch (error) {
      console.error("Error playing song:", error);
      const errorPayload =
        error?.code === "YT_DLP_NOT_FOUND"
          ? {
              content:
                "Playback fallback requires yt-dlp. Install it (Windows: winget install yt-dlp.yt-dlp) and restart the bot.",
              ephemeral: true,
            }
          : error?.code === "VOICE_ADAPTER_UNAVAILABLE"
            ? {
                content:
                  "Voice adapter is unavailable in this guild right now. Try again in a few seconds.",
                ephemeral: true,
              }
            : error?.code === "VOICE_CONNECTION_TIMEOUT" ||
                error?.code === "ABORT_ERR"
              ? {
                  content:
                    "Could not establish a stable voice session after multiple attempts. Rejoin the voice channel and run /play again.",
                  ephemeral: true,
                }
              : {
                  content:
                    "Could not fetch that video. Try another public video URL and make sure it is not age-restricted, private, or region-blocked.",
                  ephemeral: true,
                };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorPayload);
      } else {
        await interaction.reply(errorPayload);
      }
    }
  },
};
