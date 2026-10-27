# Deployment guide (Vercel)

This guide covers a Vercel deployment only. Docker and Docker Compose are
intentionally out of scope; the repository does not include a `Dockerfile` or
`compose.yaml`.

The existing demo is deployed at
<https://yc-directory-nine-lilac.vercel.app>. This guide was written from the
repository configuration and was **not** used to deploy the documentation
changes in this pass.

## 1. Prerequisites

- A GitHub repository containing this project.
- A Vercel account connected to GitHub.
- A Sanity project with a dataset.
- A GitHub OAuth app.
- Node.js 24 locally (see `.nvmrc`); the project declares
  `"node": ">=20.9.0"`.

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
5. Create a playlist document with slug `editor-picks` and add at least one
   startup. The startup detail page currently destructures the playlist result
   without a null check; missing it causes a server error. See
   [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md#4-startup-detail-crashes-when-editor-picks-is-missing).
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

`npm run build` runs `prebuild`, which executes `sanity schema extract` and
`sanity typegen generate`. The Sanity environment variables must therefore be
available during the build, and the Sanity CLI must be able to access the
project. CI skips this authenticated pre-step with
`npm run build --ignore-scripts`; generated types are committed. See
[Known issues](KNOWN_ISSUES.md#22-typegen-requires-real-sanity-access).

If Node 24 is not offered in your Vercel account, select the newest available
Node 22.x release; the package engine allows Node `>=20.9.0`, but Node 24 is the
tested version for this pass.

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
| `SENTRY_AUTH_TOKEN` | No | Build-only, sensitive | Upload source maps during the build |

Notes:

- `NEXT_PUBLIC_*` values are embedded at build time. Changing one requires a new
  deployment.
- `SANITY_WRITE_TOKEN` is read when `sanity/lib/write-client.ts` is imported. A
  missing token throws `Write token not found.` at build or runtime.
- Without `SENTRY_AUTH_TOKEN`, Sentry source-map upload is skipped. This is the
  intended CI behavior and is faster than uploading maps.
- Never commit `.env`, `.env.local`, or real values. `.env.example` contains
  placeholders only.

## 6. Deploy and verify

After the first deployment, check:

```bash
# Public home page
curl -I https://your-production-domain/

# Auth.js session endpoint: 200 with an empty object or a session
curl -s https://your-production-domain/api/auth/session

# Studio shell
curl -I https://your-production-domain/studio
```

Expected behavior:

- `/` returns `200`.
- `/studio` returns `200` and loads the Sanity Studio shell.
- `/api/auth/session` returns `200` (normally `{}` when signed out).
- `/startup/create` returns `307` to `/` when signed out.
- An unknown startup ID renders the 404 UI. The current demo returns HTTP `200`
  with that UI (a soft 404) because of PPR streaming; see
  [Known issues](KNOWN_ISSUES.md#23-not-found-pages-are-served-with-http-200).
- Signing in with GitHub creates or reuses an `author` document.
- Submitting the create form writes a `startup` document. The current success
  path does not redirect because the navigation is commented out; check Sanity
  directly after submitting.
- A startup detail page renders its Markdown pitch and increments the view
  count. The increment is non-atomic and may show stale values under load.

These checks were run against the existing demo on 2026-10-27 for the public
routes (`/`, `/studio`, `/api/auth/session`, `/startup/create`). The updated
documentation commit has not been deployed.

## 7. Sentry configuration

`next.config.ts` hardcodes:

```ts
org: "zakriakhan-g3",
project: "javascript-nextjs",
```

If you fork the project, update those values or remove the Sentry wrapper.
`SENTRY_AUTH_TOKEN` is only needed for source-map upload; a missing token does
not disable runtime error reporting.

For local builds, leave `SENTRY_AUTH_TOKEN` unset. A build with a real token took
40.1 minutes during the audit because of source-map upload.

The example routes `/sentry-example-page` and `/api/sentry-example-api` are
public diagnostics and should be removed or gated before production use.

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
| Build fails with `CorsOriginError` during schema extraction | Sanity CLI cannot access the project with the provided values | Use the real project ID and a valid Sanity CLI/user token, or skip the prebuild typegen in CI |
| Build or runtime fails with `Write token not found.` | `SANITY_WRITE_TOKEN` missing | Add an Editor token; redeploy |
| Startup detail returns 500 | No `editor-picks` playlist | Create the playlist or apply the null-safe fix in `KNOWN_ISSUES.md` |
| GitHub sign-in returns `redirect_uri` mismatch | Callback URL does not match the deployment host | Update the OAuth app callback or test on the production domain |
| Sanity requests fail from the browser | Origin missing from Sanity CORS | Add the exact origin and allow credentials if needed |
| Images fail to load | Remote host blocks hotlinking or returns non-image content | Use a reachable image URL; image domains are currently unrestricted |
| Build takes a long time | Sentry source-map upload | Unset `SENTRY_AUTH_TOKEN` for builds that do not need upload |
| Build fails with `JavaScript heap out of memory` | Node's default 2 GB heap is too small | Set `NODE_OPTIONS=--max-old-space-size=4096` for the build |
| Lint or type errors do not fail the build | `ignoreDuringBuilds` / `ignoreBuildErrors` | Run `npm run lint` and `npm run typecheck` explicitly; see known issues |
| Auth.js reports an untrusted host | Missing or incorrect `AUTH_SECRET` / host configuration | Set `AUTH_SECRET` and use the canonical deployment URL |

## 10. Operational limitations

- No database migrations: all content lives in Sanity.
- No Docker image or Compose stack is provided.
- No application health endpoint; use `/` and `/api/auth/session` for smoke
  checks.
- No rate limiting on writes or auth routes.
- No automated browser/E2E suite; the GitHub OAuth flow must be checked
  manually.
- The app uses canary/beta versions of Next.js, `next-sanity`, Auth.js, and
  Sanity Live; pin and test upgrades deliberately.
