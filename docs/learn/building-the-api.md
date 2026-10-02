# Building the API

**In one line:** `tsx` runs the TypeScript API in development, and `tsup` builds our code into one JavaScript file. The Docker image installs the libraries next to it.

## What it is

We write the API in TypeScript, but Node runs JavaScript. To **build** is to change the TypeScript into JavaScript that Node can run.

The API has two types of code:

- **Our code:** the server, the routes, the match query. It is small.
- **Libraries:** Fastify, Zod, Drizzle, postgres.js. They are thousands of files in `node_modules`.

A **bundle** is code put together into one file. A bundle can include only our code, or our code and all the libraries.

## How it fits our project

| Command | What it does |
|---|---|
| `pnpm dev` | `tsx watch` runs the TypeScript directly and starts again when you save a file. There is no build step. |
| `pnpm build` | `tsup` writes `apps/api/dist/index.js`: our code and `packages/contract` in one file. |
| `node dist/index.js` | Runs the built API. It needs `node_modules` next to it. |

`tsup.config.ts` includes `packages/contract` in the bundle, because that package contains TypeScript source, and Node cannot run TypeScript.

## The choice we made

- Our code only in the bundle. The Docker image of T-04 installs the production libraries with `pnpm deploy --prod`. Selected in the T-02 review: [#94](https://github.com/magentawood/roomsie/pull/94).
- The alternative put all libraries into one large file. The image is then smaller, but some libraries, such as the log helpers of Fastify, load other files at run time and need special settings.

## Gotchas

- `dist/index.js` cannot run alone. Copy `node_modules` with it, or use the T-04 image.
- If you add a workspace package with TypeScript source, add it to `noExternal` in `tsup.config.ts`.

## Tickets

- T-02: [#94](https://github.com/magentawood/roomsie/pull/94), 2026-10-03. The development runner, the build, and the bundle choice.
