# Music Bot (starter)

This project requires docker & docker-compose.

# Step 1. Create Discord Application

- Navigate to [the Discord Application Portal](https://discord.com/developers/applications).
- Click the Create button and name your application. You should be taken to the "General Information" tab for this application.
- Take your Application ID. This will be the `CLIENT_ID` in the .env
- Click on the bot tab. Under token, click Reset Token and take note of the generated token. This will be the `BOT_TOKEN` in the .env
- In the bot tab you can optionally configure the Username and icon image for your bot.
- In the Discord App, find the server you want to add the bot to, right click, and choose "Copy Server Info"->"Copy Server ID". This will be the `GUILD_ID` in the .env

# Step 2. Create .env File

Create a .env file with the following information from above

```
BOT_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
```

# Step 3. First-Time Startup

The first time the bot connects to a server it must be authorized. The application will log an authorization link that must be copied and ran in the browser.

Execute:

```
docker compose up --build

musicbot  |
musicbot  | > music-bot@0.1.0 start
musicbot  | > node src/index.js
musicbot  |
musicbot  | Logged in as [BOTNAME]
musicbot  | (node:19) DeprecationWarning: The ready event has been renamed to clientReady to distinguish it from the gateway READY event and will only emit under that name in v15. Please use clientReady instead.
musicbot  | (Use `node --trace-deprecation ...` to show where the warning was created)
musicbot  | Bot is logged in but is not in the configured guild [YOUR_GUILD_ID].
musicbot  | Invite it with: https://discord.com/oauth2/authorize?client_id=[CLIENT_ID]&scope=bot%20applications.commands&permissions=3148800
```

Copy the invite link and open in the browser. You will be promped to select the server you wish to add the bot to.

_IMPORTANT_

After completing the invite process you must close the docker container and restart the application.

# Step 4.

Shutdown the docker container and start it again with:

```
docker compose up
```

# Available Commands

## /play :url_or_query

Will queue and play (if no songs are currently in queue) the given YouTube URL if one is given. If a query is given the first search result will be used.

## /queueplaylist :url

Will queue and play (if no songs are currently in queue) all songs under the given YouTube playlist URL.

## /skip

Stops playback for the current song and begins playing the next song in queue.

## /stop

Stops playback for the current song.

## /clearqueue

Empties the queue.

## /join

The bot will join the voice channel of the user who sent the command. Note that both /play and /queueplaylist will automatically join the user's channel if the bot is not already present. This command is therefore mostly useless.
