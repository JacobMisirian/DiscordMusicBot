FROM node:20-bookworm-slim

WORKDIR /app

# Non-npm runtime dependencies for audio extraction/transcoding.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    unzip \
    ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  # Deno is used by yt-dlp as a JS runtime to decipher YouTube signatures.
  && curl -fsSL https://deno.land/install.sh | sh -s -- -y \
  && mv /root/.deno/bin/deno /usr/local/bin/deno \
  && chmod a+rx /usr/local/bin/deno \
  && rm -rf /var/lib/apt/lists/* /root/.deno

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

CMD ["npm", "start"]
