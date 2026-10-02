# How Roomsie is built, and why

The architecture at a glance. Each decision's full record is its ADR.

### The budget that decides everything

Four people at two hours a day for a month give ~200 real hours. Frontend takes 120–140h and backend + infra takes 60–80h. We measure each decision against the backend part ([ADR 0001](decisions/0001-rent-infrastructure.md)).

### The principle underneath

The cost of rework is not the same for all things. We spend early only on what becomes part of each client and each stored row: data model, API contract, identity and auth model, analytics event schema. Hosting, region, CDN and client libraries are cheap to change later ([ADR 0001](decisions/0001-rent-infrastructure.md)).

### The stack

<svg viewBox="0 0 640 316" role="img" aria-label="Web and KMP clients call our API over HTTPS with a bearer JWT; the API talks to Supabase, Cloudflare R2 and Firebase">
          <defs><marker id="ar" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--line-2)"/></marker></defs>
          <g font-family="Manrope, sans-serif">
            <rect x="96" y="8" width="164" height="52" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
            <text x="178" y="30" text-anchor="middle" font-size="13.5" font-weight="700" fill="var(--text)">apps/web</text>
            <text x="178" y="47" text-anchor="middle" font-size="10.5" fill="var(--text-3)">Next 16 · Tailwind v4</text>
            <rect x="380" y="8" width="164" height="52" rx="10" fill="var(--surface-2)" stroke="var(--line)" stroke-dasharray="4 3"/>
            <text x="462" y="30" text-anchor="middle" font-size="13.5" font-weight="700" fill="var(--text-3)">KMP clients</text>
            <text x="462" y="47" text-anchor="middle" font-size="10.5" fill="var(--text-3)">Compose · SwiftUI · later</text>
            <path d="M178,60 L178,92 L305,92 L305,118" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <path d="M462,60 L462,92 L335,92 L335,118" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <text x="320" y="86" text-anchor="middle" font-size="9.5" font-family="JetBrains Mono, monospace" fill="var(--accent)" letter-spacing="1">HTTPS · BEARER JWT</text>
            <rect x="192" y="120" width="256" height="64" rx="11" fill="var(--accent-wash)" stroke="var(--accent)" stroke-width="1.5"/>
            <text x="320" y="145" text-anchor="middle" font-size="15" font-weight="800" fill="var(--accent)">apps/api</text>
            <text x="320" y="163" text-anchor="middle" font-size="10.5" fill="var(--text-2)">Node · Fastify · Zod · Drizzle</text>
            <text x="320" y="177" text-anchor="middle" font-size="10" fill="var(--text-3)">all business logic lives here</text>
            <path d="M320,184 L320,206" fill="none" stroke="var(--line-2)" stroke-width="1.4"/>
            <path d="M104,206 L536,206" fill="none" stroke="var(--line-2)" stroke-width="1.4"/>
            <path d="M104,206 L104,234" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <path d="M320,206 L320,234" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <path d="M536,206 L536,234" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <rect x="20" y="236" width="168" height="64" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
            <text x="104" y="258" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">Supabase</text>
            <text x="104" y="274" text-anchor="middle" font-size="10" fill="var(--text-3)">Postgres · Realtime</text>
            <text x="104" y="288" text-anchor="middle" font-size="10" fill="var(--text-3)">broadcast only</text>
            <rect x="236" y="236" width="168" height="64" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
            <text x="320" y="258" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">Cloudflare R2</text>
            <text x="320" y="274" text-anchor="middle" font-size="10" fill="var(--text-3)">storage · CDN</text>
            <text x="320" y="288" text-anchor="middle" font-size="10" fill="var(--text-3)">zero egress</text>
            <rect x="452" y="236" width="168" height="64" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
            <text x="536" y="258" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">Firebase</text>
            <text x="536" y="274" text-anchor="middle" font-size="10" fill="var(--text-3)">Google sign-in</text>
            <text x="536" y="288" text-anchor="middle" font-size="10" fill="var(--text-3)">JWT verified by us</text>
          </g>
        </svg>

Clients hold a Firebase ID token and send requests to `apps/api`. They never open a database connection ([ADR 0002](decisions/0002-api-boundary.md)).

### Standing rules

- Our own `users.id` is the primary key in all tables. The Firebase UID is a plain `auth_provider_id` column ([ADR 0005](decisions/0005-managed-platform-split.md)).
- A Zod schema parses each byte from outside before other code touches it ([ADR 0004](decisions/0004-api-stack-typescript-fastify.md)).
- We generate and commit the OpenAPI document. All clients generate from it ([ADR 0004](decisions/0004-api-stack-typescript-fastify.md)).
- Image bytes never go through the API. Clients upload to R2 with presigned URLs ([ADR 0005](decisions/0005-managed-platform-split.md)).
- Verification selfies are in a separate, non-public bucket with short retention ([ADR 0005](decisions/0005-managed-platform-split.md)).
- Realtime is broadcast only. No client subscribes to a table ([ADR 0005](decisions/0005-managed-platform-split.md)).
- Next.js has no business logic ([ADR 0003](decisions/0003-api-as-separate-service.md)).
- Never sort by the id. `created_at` is the only chronology ([ADR 0015](decisions/0015-primary-key-strategy.md)).

### The ledger

<!-- ledger:start -->
| ID | Decision | Status | In one line |
|---|---|---|---|
| [ADR-0001](decisions/0001-rent-infrastructure.md) | Rent infrastructure, own the application layer | Accepted | For v1, we rent Postgres, object storage and the CDN, and we write the schema, migrations, queries and API endpoints by hand. |
| [ADR-0002](decisions/0002-api-boundary.md) | Clients talk to our API, never to the database | Accepted | Client apps never connect to the database: all application reads and writes go through an HTTP API that we write. |
| [ADR-0003](decisions/0003-api-as-separate-service.md) | The API is its own deployable, inside one monorepo | Accepted | One monorepo holds `apps/web` and `apps/api` as separate deployables, and Next.js route handlers hold no business logic. |
| [ADR-0004](decisions/0004-api-stack-typescript-fastify.md) | apps/api is TypeScript on Node, using Fastify and Zod | Accepted | `apps/api` uses TypeScript on Node, Fastify and Zod, and the OpenAPI document from those schemas is the single source of truth. |
| [ADR-0005](decisions/0005-managed-platform-split.md) | Managed platform split: Supabase + Firebase + Cloudflare R2 | Accepted | Supabase runs Postgres and `broadcast`-only Realtime, Firebase Authentication runs identity, and Cloudflare R2 runs object storage. |
| [ADR-0006](decisions/0006-drizzle.md) | Drizzle as the database layer | Accepted | Only `apps/api` uses Drizzle, its TypeScript schema is the single source of truth for the full database, and we commit the generated `.sql` migrations. |
| [ADR-0007](decisions/0007-web-rendering-and-auth-transport.md) | Hybrid rendering, Bearer tokens, and instant revocation | Accepted | Pages that need SEO render on the server, a Bearer Firebase ID token is the single authentication mechanism, and `users.tokens_valid_after` ships in the first migration. |
| [ADR-0008](decisions/0008-web-stack.md) | apps/web stack | Accepted | `apps/web` uses Next.js 16 App Router, React 19, Tailwind CSS v4 and TanStack Query, and we port the pages from `femmeflats-design`. |
| [ADR-0009](decisions/0009-hosting-and-region.md) | Hosting and region | Accepted | Postgres, `apps/api` and the `apps/web` functions all run in Mumbai: Supabase `ap-south-1`, Fly.io `bom` and Vercel `bom1`. |
| [ADR-0010](decisions/0010-monorepo-tooling.md) | pnpm workspaces + Turborepo | Accepted | We use pnpm workspaces for dependency management and Turborepo for task running. |
| [ADR-0011](decisions/0011-design-system-token-pipeline.md) | Design system and the Figma → code token pipeline | Accepted | Figma is the single source of truth, and a generator makes `theme.css` from `figma-variables.json`, with aliases as `var()` references, never flattened. |
| [ADR-0012](decisions/0012-analytics-event-store.md) | Analytics events live in our own Postgres | Accepted | All analytics events go to a separate, append-only Postgres instance that we own, and we use no third-party analytics vendor. |
| [ADR-0013](decisions/0013-ci-gate-and-testing.md) | The CI gate and testing baseline | Accepted | Each pull request runs typecheck, lint, `turbo build`, unit tests, API integration tests, the generated-file check, `check-tokens.mjs` and `gitleaks`. |
| [ADR-0014](decisions/0014-error-tracking.md) | Error tracking and observability | Accepted | `apps/web` and `apps/api` send errors through the Sentry SDK to self-hosted GlitchTip, behind one `reportError` wrapper, until Firebase Crashlytics for web reaches GA. |
| [ADR-0015](decisions/0015-primary-key-strategy.md) | UUIDv7 primary keys, minted by the client where possible | Accepted | Each table uses a UUIDv7 `id` primary key with no database default: the API mints it, or the client mints it for offline writes. |
| [ADR-0016](decisions/0016-credentials-and-secrets.md) | Credentials and secrets | Accepted | Public credentials can ship in the clients, but critical credentials stay only in `apps/api` or the CI secret store. |
<!-- ledger:end -->

## Learn

The team writes one page for each technical topic that a ticket teaches, for example the database driver or local development with Docker. All pages are in [Learn](learn/README.md).

<!-- learn-newest:start -->
These are the newest learn pages. The full list is in [the Learn index](learn/README.md).

- [Building the API](learn/building-the-api.md)
- [Local development with Docker](learn/local-dev-with-docker.md)
- [OpenAPI from Zod](learn/openapi-from-zod.md)
- [pnpm, Corepack and Turborepo](learn/pnpm-and-corepack.md)
- [Postgres drivers](learn/postgres-drivers.md)
<!-- learn-newest:end -->
