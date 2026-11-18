FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
ENV FX_FREE_PORT=4010
EXPOSE 4010
CMD ["node", "server.js"]
