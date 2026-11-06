# Build from hoofquake/:  docker build -f server/Dockerfile -t hoofquake .
FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/server.js"]
