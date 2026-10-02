# OpenAPI from Zod

**In one line:** the API makes its OpenAPI document from the Zod schemas in `packages/contract`. The document is committed, and a test fails when it is out of date.

## What it is

**OpenAPI** is a document, in JSON, that describes each route of an API: its URL, its inputs, and the shape of its responses. Tools read it to make typed clients, for example for a future mobile app.

**Zod** is the library that checks data at run time. Our request and response shapes are Zod schemas in `packages/contract`. Thus one schema does three jobs: it checks the data, it gives the TypeScript type, and it makes the OpenAPI document.

## How it fits our project

- Each route gives its schemas to Fastify, for example `{ schema: { response: { 200: healthResponse } } }`. `fastify-type-provider-zod` connects Zod to Fastify, and `@fastify/swagger` collects the schemas.
- `pnpm --filter @roomsie/api openapi` writes `packages/contract/openapi.json`.
- A test compares the committed file with the document that the code makes. When you change a route or a schema, run the command and commit the file.

## The choice we made

- Generate the document from Zod and commit it: [ADR-0004](../decisions/0004-api-stack-typescript-fastify.md).
- Set up in T-02, not in T-08, by the decision of the user in the review: [#94](https://github.com/magentawood/roomsie/pull/94).

## Gotchas

- **The test "is committed and current" fails:** you changed a route or a schema. Run the openapi command and commit `openapi.json`.
- Fastify also checks each response with the schema. A handler that returns a different shape gives an error, not bad data.

## Tickets

- T-02: [#94](https://github.com/magentawood/roomsie/pull/94), 2026-10-03. The generator, the first route and the test.
