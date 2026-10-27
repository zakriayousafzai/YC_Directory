# YC Directory

[![CI](https://github.com/zakriayousafzai/YC_Directory/actions/workflows/ci.yml/badge.svg)](https://github.com/zakriayousafzai/YC_Directory/actions/workflows/ci.yml)

A full-stack directory for publishing and discovering startup pitches. Built
with the Next.js App Router, Sanity, Auth.js, and Tailwind CSS.

[Live demo](https://yc-directory-nine-lilac.vercel.app) ·
[Deployment guide](docs/DEPLOYMENT.md) ·
[Contributing](CONTRIBUTING.md) ·
[Security](SECURITY.md)

![YC Directory home page while signed in](docs/screenshots/home-hero.png)

> **Project status:** portfolio project. The app uses the current stable Next.js,
> React, Sanity, and Sentry releases. Lint, type checking, tests, the production
> build, and the production dependency audit run as blocking CI checks.

## Demo

The existing deployment is available at
<https://yc-directory-nine-lilac.vercel.app>.

The screenshots in this README were captured from a local production build of
this repository while signed in with GitHub.

![Startup detail page](docs/screenshots/startup-detail.png)

*The detail page renders the pitch as Markdown, shows the author, and displays a
view count.*

### Signed-in views

The header shows **Create**, **Logout**, and the GitHub avatar when a session is
active. `/startup/create` redirects signed-out visitors to the home page.

![Create startup form](docs/screenshots/create-startup.png)

*The create form includes title, description, category, image URL, and a
Markdown pitch editor.*

![Author profile](docs/screenshots/user-profile.png)

*The profile page shows the signed-in author's GitHub avatar, handle, bio, and
startups, using the responsive stacked layout at a 1023px viewport.*

## Features

- **Browse a startup directory** with cards for the latest pitches and
  offset pagination at nine startups per page.
- **Search** by title, category, or author name through a Sanity GROQ query. The
  slug and search conditions are grouped so every branch requires a published
  slug.
- **Sign in with GitHub** through Auth.js v5. A Sanity `author` document is
  created on first sign-in and the Sanity `_id` is carried in the session.
- **Create a pitch** with a Markdown editor, auto-generated slug, category, and
  image URL. Inputs are validated on the server with Zod, image URLs can point
  at any HTTP(S) host, and submissions are rate limited. The Next.js image
  optimizer rejects non-image responses and SVGs, blocks private addresses, and
  caps responses at 5 MB.
- **Read pitch details** with Markdown rendering, author information, optional
  editor picks, and an atomic view counter.
- **View author profiles** and their submitted startups, with pagination.
- **Manage content** in the embedded Sanity Studio at `/studio`.
- **Live content** through Sanity's Live Content API and `SanityLive`.
- **Error monitoring** configured with Sentry through environment variables.
- **Security headers** including CSP, frame denial, content-type sniffing
  protection, referrer policy, and a permissions policy.
- **Tests** for validation, utilities, Markdown safety, the pitch server action,
  auth callbacks, the view route, rate limiting, pagination, image URLs, and
  the create form.

There is no voting feature and no vote data model.

## Tech stack

| Layer | Technology | Version in this repo |
| --- | --- | --- |
| Framework | [Next.js](https://nextjs.org/) App Router | `16.4.3` |
| UI runtime | [React](https://react.dev/) | `19.3.1` |
| Language | [TypeScript](https://www.typescriptlang.org/) | `5.9.3` |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | `3.4.19` |
| CMS | [Sanity](https://www.sanity.io/) | `6.20.0` |
| CMS integration | [`next-sanity`](https://github.com/sanity-io/next-sanity) | `13.4.0` |
| Authentication | [Auth.js](https://authjs.dev/) (`next-auth`) | `5.0.0-beta.32` (pinned) |
| Markdown | [`markdown-it`](https://github.com/markdown-it/markdown-it) | `14.3.3` |
| Error monitoring | [Sentry](https://sentry.io/) for Next.js | `11.9.0` |
| Tests | [Vitest](https://vitest.dev/) + Testing Library | `5.0.5` |
| Runtime | Node.js | 24 (`.nvmrc`; engines `>=22.12.0`) |

Auth.js v5 has no stable release yet, so `next-auth` is pinned to an exact beta
version. Upgrade it deliberately and re-run the auth tests after any bump.

## Architecture

```mermaid
flowchart LR
  U[Browser] --> N[Next.js App Router]
  N -->|Server Components / GROQ| S[(Sanity Content Lake)]
  N -->|Auth.js GitHub provider| G[GitHub OAuth]
  N -->|Embedded Studio| S
  N -->|Server action writes| W[Sanity write client]
  N -->|POST /api/views/[id]| W
  W --> S
  N -->|Errors and traces| E[Sentry]
  N -->|Hosted on| V[Vercel]
```

- **Reads:** Server Components use `sanityFetch` or the Sanity client.
- **Writes:** `createPitch` runs as a server action with the server-only Sanity
  write client. It validates input, enforces a per-author rate limit, awaits the
  write, and returns the new document `_id`.
- **Auth:** Auth.js uses the GitHub provider. The JWT/session carries the Sanity
  author `_id`.
- **Views:** `components/ViewCounter.tsx` calls `POST /api/views/[id]` once per
  browser session. The route increments with
  `setIfMissing({ views: 0 }).inc({ views: 1 })` so concurrent views do not
  overwrite each other.
- **Rate limiting:** `lib/rate-limit.ts` keeps fixed-window counters in memory
  for the create action, view route, and Auth.js routes. This is per server
  instance; use a shared store if you need a global limit.
- **Observability:** Sentry is initialized through `instrumentation.ts`,
  `instrumentation-client.ts`, `sentry.server.config.ts`, and
  `sentry.edge.config.ts`. It is disabled when `NEXT_PUBLIC_SENTRY_DSN` is
  unset.

## Quickstart

### Prerequisites

- Node.js 22.12 or newer (Node.js 24 is tested; see `.nvmrc`).
- npm (the repository uses `package-lock.json`).
- A Sanity project and dataset.
- A GitHub OAuth app.

### 1. Clone and install

```bash
git clone https://github.com/zakriayousafzai/YC_Directory.git
cd YC_Directory
npm ci
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

On PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill in the values described in [Environment variables](#environment-variables).
Never commit `.env` or `.env.local`.

### 3. Configure Sanity

1. Make the dataset publicly readable. The app does not use a read token.
2. Add CORS origins for `http://localhost:3000` and your deployed origin.
3. Create an **Editor** token and set `SANITY_WRITE_TOKEN`.
4. Optionally create a playlist with slug `editor-picks`. The detail page treats
   a missing playlist as an empty list.
5. Optionally add sample startups. The first GitHub sign-in creates the author.

### 4. Configure GitHub OAuth

Create a GitHub OAuth app with:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL:
  `http://localhost:3000/api/auth/callback/github`

Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`. Generate `AUTH_SECRET` with
`openssl rand -base64 32` or the Node command in `.env.example`.

### 5. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>. The Sanity Studio is at
<http://localhost:3000/studio>.

For a production build locally:

```bash
npm run build
npm start
```

After changing the Sanity schema or GROQ queries, regenerate the committed types:

```bash
npm run typegen
```

## Environment variables

| Variable | Required | Exposure | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Yes | Public | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Yes | Public | Sanity dataset name |
| `NEXT_PUBLIC_SANITY_API_VERSION` | No | Public | Defaults to `2025-07-25` |
| `SANITY_WRITE_TOKEN` | Yes for writes | Server-only | Sanity Editor token for author creation, pitch creation, and view updates |
| `AUTH_SECRET` | Yes | Server-only | Auth.js session encryption secret |
| `AUTH_GITHUB_ID` | Yes | Server-side | GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | Yes | Server-only | GitHub OAuth client secret |
| `AUTH_TRUST_HOST` | Non-Vercel hosts | Server-only | Trust the proxy's `Host` header; Vercel sets this automatically |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Public | Enables Sentry when set |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | No | Public | Client trace sample rate; defaults to `0.1` |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Server-only | Server trace sample rate; defaults to `0.1` |
| `SENTRY_AUTH_TOKEN` | No | Build-only | Uploads source maps during the build; omit locally |
| `SENTRY_ORG` | No | Build-only | Sentry organization slug |
| `SENTRY_PROJECT` | No | Build-only | Sentry project slug |

The repository does **not** use `SANITY_API_READ_TOKEN` or
`SANITY_API_WRITE_TOKEN`. Use the names above.

See [`.env.example`](.env.example) for safe placeholders and setup comments.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint over the repository |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run typegen` | Extract the Sanity schema and generate TypeScript types |

Typegen is explicit rather than a `predev`/`prebuild` hook, so local development
and CI builds do not need an authenticated Sanity CLI session.

## Project structure

```text
app/
  (root)/                 Public directory, startup detail, create, user profile
  api/auth/[...nextauth]/ Auth.js route handler
  api/views/[id]/         Atomic view-count increment
  studio/[[...tool]]/     Embedded Sanity Studio
components/               Navbar, search, cards, form, pagination, view counter
lib/
  action.ts               createPitch server action
  action-state.ts         Shared action state and field-error types
  image-url.ts            HTTP(S) image URL validation
  pagination.ts           Page parsing and GROQ slice helpers
  queries.ts              GROQ queries
  rate-limit.ts           In-memory fixed-window limiter
  utils.ts                cn, date formatting, response cloning
  validation.ts           Zod form schema and image checks
sanity/
  lib/                    Read client, write client, live content
  schemaTypes/            author, startup, playlist schemas
tests/                    Vitest unit and component tests
docs/                     Deployment guide and screenshots
auth.ts                   Auth.js configuration
next.config.ts            Next.js, image, header, and Sentry configuration
```

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Startup directory, search, and pagination |
| `/startup/[id]` | Public | Startup detail and pitch |
| `/startup/create` | Signed-in users | Submit a startup (redirects to `/` when signed out) |
| `/user/[id]` | Public | Author profile and their startups, with pagination |
| `/studio/[[...tool]]` | Public shell, Sanity-authenticated editing | Embedded Sanity Studio |
| `/api/auth/[...nextauth]` | Public | Auth.js route handler |
| `/api/views/[id]` | Public, rate limited | Increment a startup's view count |

## Testing

```bash
npm test
npm run test:watch
```

The suite covers:

- `tests/validation.test.ts` — valid and invalid pitch payloads, arbitrary
  HTTP(S) image hosts, and rejected protocols or credentials.
- `tests/utils.test.ts` — `cn`, `formateDate`, and
  `parseServerActionResponse`.
- `tests/markdown.test.ts` — default Markdown rendering, raw HTML escaping, and
  blocked `javascript:` links.
- `tests/action.test.ts` — unauthenticated rejection, validation errors, the
  authenticated write payload, rate limiting, and generic write failures.
- `tests/auth.test.ts` — first sign-in author creation, duplicate avoidance,
  missing GitHub ids, and JWT/session id mapping.
- `tests/views-route.test.ts` — atomic increment, missing startups, invalid ids,
  write failures, and rate limiting.
- `tests/auth-route.test.ts` — Auth.js handler delegation and rate limiting.
- `tests/rate-limit.test.ts` — window behavior and client IP parsing.
- `tests/pagination.test.ts` — page parsing, ranges, and total pages.
- `tests/image-url.test.ts` — accepted hosts and protocols, credentials, and
  malformed image URLs.
- `tests/startup-form.test.tsx` — success redirect, field errors, and generic
  server errors.

GitHub OAuth end-to-end and real Sanity writes are not automated; run those
manually against a development project.

## CI

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests, and manual
dispatches:

1. Install with `npm ci` on the Node version from `.nvmrc`.
2. Run `npm run lint`.
3. Run `npm run typecheck`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run `npm audit --omit=dev --audit-level=high`.

All steps are blocking. The workflow uses placeholder environment values and no
secrets; Sentry source-map upload is disabled because `SENTRY_AUTH_TOKEN` is
empty.

## Deployment

The project is configured for Vercel and a standard Node host:

```bash
npm ci
npm run build
npm start
```

A clean build may need a larger Node heap; CI sets
`NODE_OPTIONS=--max-old-space-size=4096`.

For the full Vercel checklist — Sanity CORS, the optional `editor-picks`
playlist, GitHub OAuth callbacks, environment variables, health checks, Sentry,
rate-limit notes, and rollback — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Docker and Docker Compose are intentionally out of scope. The repository does
not include a `Dockerfile`.

## Security

Do not open a public issue for a vulnerability. See [SECURITY.md](SECURITY.md)
for the reporting process and the current security scope.

The repository contains no tracked `.env` file or real credentials. If a secret
is ever committed, rotate it immediately.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch conventions, checks,
and pull-request expectations. Keep behavior changes explicit and add tests for
new server actions or routes.

## License

[MIT](LICENSE) © 2025-2026 Zakria Khan.

## Acknowledgements

- **[JavaScript Mastery](https://www.youtube.com/@javascriptmastery)** — this
  project follows the YC Directory/startup pitching platform build and tutorial.
  Thanks for the original walkthrough and design direction.
- [Next.js](https://nextjs.org/), [Sanity](https://www.sanity.io/),
  [Auth.js](https://authjs.dev/), and [Sentry](https://sentry.io/) for the
  platform and developer tooling.
- [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/),
  [Tailwind CSS](https://tailwindcss.com/), and
  [Lucide](https://lucide.dev/) for the UI building blocks.
