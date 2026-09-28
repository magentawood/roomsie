// The API contract, shared by apps/api and every client (ADR 0004).
//
// Zod schemas live here. apps/api builds its routes from them, and the
// OpenAPI document generated from those routes is committed as openapi.json
// in this package. Regenerate it with `pnpm --filter @roomsie/api openapi`.

export * from './health'
