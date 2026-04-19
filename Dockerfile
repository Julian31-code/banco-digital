FROM node:20-slim AS build

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ lib/
COPY artifacts/ artifacts/
COPY scripts/ scripts/
COPY api/ api/

RUN pnpm install --frozen-lockfile

RUN pnpm run build:railway

FROM node:20-slim

WORKDIR /app

COPY --from=build /app/dist-railway ./dist-railway

EXPOSE 10000

CMD ["node", "dist-railway/server.mjs"]
