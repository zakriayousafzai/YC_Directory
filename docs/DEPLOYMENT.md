# Deployment guide (Vercel)

This guide covers a Vercel deployment only. Docker and Docker Compose are
intentionally out of scope; the repository does not include a `Dockerfile` or
`compose.yaml`.

The existing demo is deployed at
<https://yc-directory-nine-lilac.vercel.app>.

## 1. Prerequisites

- A GitHub repository containing this project.
- A Vercel account connected to GitHub.
- A Sanity project with a dataset.
- A GitHub OAuth app.
- Node.js 22.12 or newer locally (see `.nvmrc`); Node.js 24 is the tested
  version.

## 2. Prepare Sanity

1. Create a Sanity project and dataset (the examples use `production`).
2. Make the dataset publicly readable. The browser client reads without a read
   token, and the repository does not define `SANITY_API_READ_TOKEN`.
3. Add CORS origins in **Sanity → API → CORS origins**:
   - `http://localhost:3000` for local development.
   - Your production origin, for example
     `https://yc-directory-nine-lilac.vercel.app`.
   - Enable **Allow credentials** for origins used by the Studio.
4. Create an **Editor** API token and store it as `SANITY_WRITE_TOKEN`. This
   token is server-only and must never use a `NEXT_PUBLIC_` prefix.
5. Optionally create a playlist document with slug `editor-picks` and add
   startups to it. The startup detail page treats a missing playlist as an empty
   list, so this is not required.
6. Optionally create a few startup documents and an author for local testing.
   Authors are normally created on first GitHub sign-in.

## 3. Prepare GitHub OAuth

Create a GitHub OAuth app at **GitHub → Settings → Developer settings → OAuth
Apps**.

| Setting | Local value | Production value |
| --- | --- | --- |
| Homepage URL | `http://localhost:3000` | `https://your-production-domain` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` | `https://your-production-domain/api/auth/callback/github` |

GitHub OAuth apps accept one callback URL. Preview deployments get unique
`*.vercel.app` hostnames, so sign-in on a preview URL may fail with a
`redirect_uri` mismatch unless you create a separate OAuth app for previews or
test authentication on the production domain.

Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` from the OAuth app. Generate
`AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

On PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 4. Import the project into Vercel

1. In Vercel, choose **Add New → Project** and import the repository.
2. Keep the root directory at the repository root (`./`).
3. Select the **Next.js** framework preset.
4. Use these build settings:

| Setting | Value |
| --- | --- |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `.next` (Next.js default) |
| Node.js Version | 24.x (from `.nvmrc`) |

`npm run build` does not run the Sanity CLI. Generated types are committed, and
`npm run typegen` remains an explicit command for schema changes. This means the
build only needs the environment variables listed below, not an authenticated
Sanity CLI session.

## 5. Configure environment variables

Add these in **Vercel → Project → Settings → Environment Variables**. Apply them
to Production (and Preview if you test previews).

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Yes | Public, build + runtime | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Yes | Public, build + runtime | Dataset name, for example `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | No | Public, build + runtime | Defaults to `2025-07-25` |
| `SANITY_WRITE_TOKEN` | Yes | Server-only, sensitive | Author creation, pitch creation, view updates |
| `AUTH_SECRET` | Yes | Server-only, sensitive | Auth.js session encryption |
| `AUTH_GITHUB_ID` | Yes | Server-side | GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | Yes | Server-only, sensitive | GitHub OAuth client secret |
| `AUTH_TRUST_HOST` | Non-Vercel hosts | Server-only | Trust the proxy's `Host` header; Vercel sets this automatically |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Public, runtime | Enables Sentry when set |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | No | Public, runtime | Client trace sample rate; defaults to `0.1` |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Server-only, runtime | Server trace sample rate; defaults to `0.1` |
| `SENTRY_AUTH_TOKEN` | No | Build-only, sensitive | Upload source maps during the build |
| `SENTRY_ORG` | No | Build-only | Sentry organization slug |
| `SENTRY_PROJECT` | No | Build-only | Sentry project slug |

Notes:

- `NEXT_PUBLIC_*` values are embedded at build time. Changing one requires a new
  deployment.
- Auth.js rejects untrusted hosts in production. Vercel is detected
  automatically; set `AUTH_TRUST_HOST=true` on other Node hosts, or when
  running `npm start` locally.
- `SANITY_WRITE_TOKEN` is read when `sanity/lib/write-client.ts` is imported. A
  missing token throws `Write token not found.` at build or runtime.
- Sentry is disabled when `NEXT_PUBLIC_SENTRY_DSN` is empty. Without
  `SENTRY_AUTH_TOKEN`, source-map upload is skipped; runtime reporting still
  works when a DSN is present.
- Never commit `.env`, `.env.local`, or real values. `.env.example` contains
  placeholders only.

## 6. Deploy and verify

After the first deployment, check:

```bash
# Public home page
curl -I https://your-production-domain/

# Auth.js session endpoint: 200 with null or a session
curl -s https://your-production-domain/api/auth/session

# Studio shell
curl -I https://your-production-domain/studio
```

Expected behavior:

- `/` returns `200`.
- `/studio` returns `200` and loads the Sanity Studio shell.
- `/api/auth/session` returns `200` (normally `null` when signed out).
- `/startup/create` redirects to `/` when signed out.
- Unknown startup and author IDs return HTTP `404` with the not-found page.
- Signing in with GitHub creates or reuses an `author` document.
- Submitting the create form writes a `startup` document, shows a success toast,
  and redirects to `/startup/[id]`.
- A startup detail page renders its Markdown pitch. The first view in a browser
  session calls `POST /api/views/[id]`, which increments the counter atomically.
- Responses include `Content-Security-Policy`, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.

## 7. Sentry configuration

Sentry is configured entirely through environment variables:

- `NEXT_PUBLIC_SENTRY_DSN` enables the client, server, and edge SDKs.
- `SENTRY_ORG` and `SENTRY_PROJECT` select the project for source-map upload.
- `SENTRY_AUTH_TOKEN` enables source-map upload. Leave it unset for local builds
  that do not need upload.

The old `/sentry-example-page` and `/api/sentry-example-api` diagnostic routes
have been removed. Use a real error or the Sentry SDK's test command to verify
reporting.

## 8. Rollback

Use the Vercel dashboard:

1. Open **Deployments**.
2. Select the last known-good deployment.
3. Choose **Promote to Production** (or **Redeploy** for the same commit).

If the Vercel CLI is linked locally, `vercel rollback` is available, but this
repository does not include a Vercel project link or CLI configuration.

Rolling back the app does **not** roll back Sanity content. Use Sanity's document
history or your own backup process for content changes.

## 9. Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Build fails with `Missing environment variable: NEXT_PUBLIC_SANITY_DATASET` | Sanity variables absent at build time | Add them to the Vercel project and redeploy |
| Build fails with `Write token not found.` | `SANITY_WRITE_TOKEN` missing | Add an Editor token; redeploy |
| Startup detail shows no editor picks | No `editor-picks` playlist or playlist is empty | Optional; create the playlist to populate the section |
| GitHub sign-in returns `redirect_uri` mismatch | Callback URL does not match the deployment host | Update the OAuth app callback or test on the production domain |
| Sanity requests fail from the browser | Origin missing from Sanity CORS | Add the exact origin and allow credentials if needed |
| Images fail to load | Host is not on the allowlist or returns non-image content | Use one of the supported hosts listed in `lib/image-hosts.ts`; the form validates reachability |
| Build takes a long time | Sentry source-map upload | Unset `SENTRY_AUTH_TOKEN` for builds that do not need upload |
| Build fails with `JavaScript heap out of memory` | Node's default heap is too small | Set `NODE_OPTIONS=--max-old-space-size=4096` for the build |
| Auth.js reports an untrusted host | Missing or incorrect `AUTH_SECRET` / host configuration | Set `AUTH_SECRET` and use the canonical deployment URL |
| A write or auth request returns `429 Too many requests` | The in-memory rate limiter rejected the request | Wait for the window to reset; the limit is per server instance |

## 10. Operational notes

- No database migrations: all content lives in Sanity.
- No Docker image or Compose stack is provided.
- No application health endpoint; use `/` and `/api/auth/session` for smoke
  checks.
- Rate limiting is in memory and therefore per server instance. Use a shared
  store such as Redis if you need a global limit across instances.
- Auth.js v5 is still pre-release; `next-auth` is pinned to
  `5.0.0-beta.32` and should be upgraded deliberately.
- The test suite covers validation, the server action, auth callbacks, the view
  route, rate limiting, pagination, image hosts, and the create form. GitHub
  OAuth and real Sanity writes still need a manual smoke test.
