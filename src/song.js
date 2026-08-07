const {
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  StreamType,
} = require("@discordjs/voice");
const { Readable } = require("stream");
const { spawn } = require("child_process");
const prism = require("prism-media");
const { Innertube } = require("youtubei.js");
const ytdl = require("@distube/ytdl-core");

async function createYtDlpAudioStream(videoUrl) {
  const baseArgs = [
    "--no-playlist",
    "-f",
    "bestaudio[ext=webm]/bestaudio",
    "-o",
    "-",
    videoUrl,
  ];

  const envYtDlpPath = process.env.YT_DLP_PATH;
  const commandCandidates = [
    ...(envYtDlpPath ? [{ command: envYtDlpPath, args: baseArgs }] : []),
    { command: "yt-dlp", args: baseArgs },
    { command: "yt-dlp.exe", args: baseArgs },
    { command: "python3", args: ["-m", "yt_dlp", ...baseArgs] },
    { command: "python", args: ["-m", "yt_dlp", ...baseArgs] },
    { command: "py", args: ["-m", "yt_dlp", ...baseArgs] },
  ];

  let lastError = null;

  for (const candidate of commandCandidates) {
    try {
      return await new Promise((resolve, reject) => {
        const proc = spawn(candidate.command, candidate.args, {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });

        let settled = false;

        proc.once("error", (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        });

        proc.once("spawn", () => {
          if (settled) return;
          settled = true;
          resolve({ stream: proc.stdout, process: proc });
        });

        proc.once("close", (code) => {
          if (settled) return;
          settled = true;
          reject(
            new Error(
              `${candidate.command} exited before streaming (code ${code}).`,
            ),
          );
        });
      });
    } catch (error) {
      lastError = error;
      if (error?.code === "ENOENT") {
        continue;
      }
      // Try next candidate before failing the fallback chain.
      continue;
    }
  }

  const missingBinaryError = new Error(
    `yt-dlp unavailable. Tried command candidates from PATH${envYtDlpPath ? " and YT_DLP_PATH" : ""}.${lastError ? ` Last error: ${lastError.message}` : ""}`,
  );
  missingBinaryError.code = "YT_DLP_NOT_FOUND";
  throw missingBinaryError;
}

module.exports = class Song {
  constructor({ title, url, requestedBy, duration = null }) {
    this.title = title;
    this.url = url;
    this.requestedBy = requestedBy;
    this.duration = duration; // seconds
    this.player = null;
    this.sourceProcess = null;
    this.stopped = false;
    this.paused = false;
  }

  async playSongInDiscord(client, connection) {
    this.stopped = false;
    const videoId = this.url.split("v=")[1]?.split("&")[0] ?? this.url;
    const videoUrl = this.url.startsWith("http")
      ? this.url
      : `https://www.youtube.com/watch?v=${this.url}`;

    let stream;
    this.sourceProcess = null;

    const ytDlpResult = await createYtDlpAudioStream(videoUrl);
    stream = ytDlpResult.stream;
    this.sourceProcess = ytDlpResult.process;

    console.log(
      `[song] yt-dlp process started, PID: ${this.sourceProcess.pid}`,
    );
    this.sourceProcess.stderr.on("data", (chunk) =>
      console.error("[song] yt-dlp stderr:", chunk.toString().trimEnd()),
    );
    this.sourceProcess.once("close", (code) =>
      console.log(`[song] yt-dlp process exited with code ${code}`),
    );

    // Build FFmpeg transcoder pipeline
    console.log("[song] Creating FFmpeg transcoder...");
    const transcoder = new prism.FFmpeg({
      args: [
        "-loglevel",
        "warning",
        "-probesize",
        "65536",
        "-i",
        "pipe:0",
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "2",
      ],
      shell: false,
    });

    if (transcoder.process) {
      transcoder.process.stderr.on("data", (chunk) =>
        console.error("[song] FFmpeg stderr:", chunk.toString().trimEnd()),
      );
      transcoder.process.once("close", (code) =>
        console.log(`[song] FFmpeg process exited with code ${code}`),
      );
    }

    transcoder.once("error", (err) =>
      console.error("[song] Transcoder error:", err.message),
    );
    transcoder.once("close", () => console.log("[song] Transcoder closed."));

    stream.once("error", (err) =>
      console.error("[song] Source stream error:", err.message),
    );
    stream.pipe(transcoder);

    const resource = createAudioResource(transcoder, {
      inputType: StreamType.Raw,
    });

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.player = player;

    player.on("stateChange", (oldState, newState) => {
      console.log(
        `[song] Player state: ${oldState.status} -> ${newState.status}`,
      );
    });

    player.on("error", (error) => {
      console.error("[song] Audio player error:", error.message);
      this._cleanup();
    });

    player.on(AudioPlayerStatus.Idle, () => {
      this._cleanup();
    });

    connection.subscribe(player);
    player.play(resource);
    console.log(
      `[song] Playback started. Player state: ${player.state.status}`,
    );
  }

  stop() {
    this.stopped = true;
    this.paused = false;
    if (this.player) {
      this.player.stop(true);
    }
    this._cleanup();
  }

  pause() {
    if (this.player && !this.paused) {
      this.player.pause();
      this.paused = true;
    }
  }

  resume() {
    if (this.player && this.paused) {
      this.player.unpause();
      this.paused = false;
    }
  }

  _cleanup() {
    if (this.sourceProcess) {
      this.sourceProcess.kill();
      this.sourceProcess = null;
    }
  }

  toString(showLinkPreviews = false) {
    const songLength = this.duration; // seconds, stored at enqueue time
    const playbackDurationMs = this.player?.state?.resource?.playbackDuration;
    const currentTime =
      typeof playbackDurationMs === "number"
        ? playbackDurationMs / 1000
        : undefined;

    let lengthStr = null;
    const lengthDate = songLength ? new Date(songLength * 1000) : null;
    if (lengthDate && !isNaN(lengthDate.getTime())) {
      if (songLength >= 3600) {
        lengthStr = lengthDate.toISOString().substr(11, 8);
      } else {
        lengthStr = lengthDate.toISOString().substr(14, 5);
      }
    }

    let currentTimeStr = null;
    const currentTimeDate = currentTime ? new Date(currentTime * 1000) : null;
    if (currentTimeDate && !isNaN(currentTimeDate.getTime())) {
      if (currentTime >= 3600) {
        currentTimeStr = currentTimeDate.toISOString().substr(11, 8);
      } else {
        currentTimeStr = currentTimeDate.toISOString().substr(14, 5);
      }
    }

    const progressStr =
      currentTimeStr && lengthStr
        ? ` [${currentTimeStr} / ${lengthStr}]`
        : lengthStr
          ? ` [${lengthStr}]`
          : "";
    return `**[${this.title}](${showLinkPreviews ? "" : "<"}${this.url}${showLinkPreviews ? "" : ">"})** - requested by **${this.requestedBy}**${progressStr}${this.paused ? " (paused)" : ""}${this.stopped ? " (stopped)" : ""}`;
  }
};
