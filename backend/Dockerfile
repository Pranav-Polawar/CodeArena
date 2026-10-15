FROM node:20-bookworm-slim

# Docker CLI only (no daemon): lets the backend start sandbox containers
# through the mounted /var/run/docker.sock
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
