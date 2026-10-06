# Build from the repo root: the API needs the workspace packages and the lockfile.
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@roomsie/api..." --ignore-scripts
RUN pnpm --filter @roomsie/api build
RUN pnpm --filter @roomsie/api deploy --prod --legacy /out

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
