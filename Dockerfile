FROM node:24-bookworm-slim AS dependencies

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS dev

COPY . .
RUN npm run postinstall
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS build

COPY . .
RUN npm run postinstall && npm run build

FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3000 \
  LOCAL_STORAGE_DIR=/app/data/media
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data/media \
  && chown -R node:node /app
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/site').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
