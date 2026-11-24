# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_PATH=/app/data/soflex-copilot.db \
    DATASET_CSV_PATH=/app/docs/dataset_challenge_soflex.csv

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY docs/dataset_challenge_soflex.csv ./docs/dataset_challenge_soflex.csv

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "dist/server.js"]
