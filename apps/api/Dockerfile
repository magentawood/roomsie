# Build from the repo root: the API needs the workspace packages and the lockfile.
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@roomsie/api..." --ignore-scripts
RUN pnpm --filter @roomsie/api build
RUN pnpm --filter @roomsie/api deploy --prod --legacy /out

FROM node:22-slim
WORKDIR /app
COPY --from=build /out .
USER node
CMD ["node", "dist/index.js"]
