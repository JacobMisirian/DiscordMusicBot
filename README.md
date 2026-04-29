# Music Bot

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
INACTIVITY_TIMEOUT_MS=... # Default 300000 (5 minutes)
```

# Step 3. Invite bot

Using the `CLIENT_ID` obtained in Step 1, visit the following page in your browser:

```
https://discord.com/oauth2/authorize?client_id=[CLIENT_ID]&scope=bot%20applications.commands&permissions=3148800
```

Select the server you wish to add the bot to and authorize the bot.

# Step 4.

Start the application with docker-compose:

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

Stops playback for the current song. Will not allow resuming. /skip must be used.

## /pause

Pauses playback for the current song. Will not count as inactivity.

## /resume

Resumes playback for the current paused song.

## /nowplaying

Shows the currently playing song, with link to the source video, the name of the user that requested it, the paused/stopped status of the song if applicable, and the current timestamp.

## /showqueue

Displays the contents of the queue, with links to the source videos and the name of the user who requested them, the paused/stopped status of the song if applicable, and the current timestamp.

## /remove :position

Removes the song at the specified 1-indexed position from the queue.

## /clearqueue

Empties the queue.

## /join

The bot will join the voice channel of the user who sent the command. Note that both /play and /queueplaylist will automatically join the user's channel if the bot is not already present. This command is therefore mostly useless.
