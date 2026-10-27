# Known issues

This document records issues found during the portfolio/hygiene audit. The
audit was intentionally scoped to documentation, metadata, tests, and CI. No
application code was changed, so the issues below remain open.

Verified on **2026-10-27** with Node **24.13.0** and npm **11.21.1**.

## Status summary

| Area | Status | Impact |
| --- | --- | --- |
| TypeScript | `npm run typecheck` fails with 12 errors | Build does not catch type regressions |
| ESLint | `npm run lint` fails with 4 errors and 3 warnings | Build does not catch lint regressions |
| Tests | `npm test` passes (19 tests) | Core utilities and one server action are covered; UI and OAuth are not |
| Build | `npm run build` passes | Type and lint checks are disabled in `next.config.ts` |
| Dependencies | `npm audit` reports 62 advisories | Includes 2 critical transitive advisories in Sanity tooling |
| Runtime | Demo responds on public routes | Several correctness and hardening defects remain |
| Routing | Unknown detail/profile routes return HTTP `200` with the 404 UI | Soft 404; ambiguous SEO and uptime signals |

## 1. TypeScript errors in `auth.ts`

`npm run typecheck` currently reports **12 errors**, all originating in
`auth.ts`:

```text
auth.ts(7,52): error TS2349: This expression is not callable.
  Type 'typeof import("next-auth")' has no call signatures.
auth.ts(11,15) ... (12,29): implicit any for name, email, image, id, login, bio
auth.ts(34,17) ... (47,30): implicit any for token, account, profile, session
```

Root cause: `next-auth.d.ts` declares `module "next-auth"` without a top-level
import or export. That makes the file an ambient module declaration rather than
a module augmentation, so it can shadow the real `next-auth` exports.

Suggested direction (not applied): add `import "next-auth";` or import a type
from `next-auth` before `declare module "next-auth"`, and augment
`next-auth/jwt` for the JWT `id` field. Re-run `npm run typecheck` afterwards.

Impact: `next.config.ts` sets `typescript.ignoreBuildErrors`, so production
builds succeed even though types are broken.

## 2. ESLint errors and warnings

`npm run lint` fails with:

| File | Line | Rule | Message |
| --- | --- | --- | --- |
| `components/StartupCard.tsx` | 46 | `@typescript-eslint/no-non-null-asserted-optional-chain` | Non-null assertion after an optional chain |
| `components/StartupCard.tsx` | 47 | `@typescript-eslint/no-non-null-asserted-optional-chain` | Non-null assertion after an optional chain |
| `components/StartupForm.tsx` | 24 | `@typescript-eslint/no-explicit-any` | `prevState: any` |
| `lib/action.ts` | 9 | `@typescript-eslint/no-explicit-any` | `state: any` |

Warnings:

- `components/StartupCard.tsx:58` uses `<img>` instead of `next/image`.
- `components/StartupForm.tsx:18` assigns `router` but never uses it.
- `components/StartupForm.tsx:76` assigns `state` but never uses it.

`next.config.ts` sets `eslint.ignoreDuringBuilds`, so `npm run build` does not
fail on these findings.

## 3. Search query precedence bug

`lib/queries.ts:4` contains:

```groq
*[_type == "startup" && defined(slug.current) && !defined($search)
  || title match $search
  || category match $search
  || author->name match $search]
```

`&&` binds more tightly than `||`. With a search term, the slug condition only
applies to the `!defined($search)` branch, so results matching a title,
category, or author can include documents without a valid slug. The intended
shape is likely:

```groq
*[
  _type == "startup" &&
  defined(slug.current) &&
  (
    !defined($search) ||
    title match $search ||
    category match $search ||
    author->name match $search
  )
]
```

Impact: search can return unexpected documents and links with a missing slug.
No test asserts the current behavior.

## 4. Startup detail crashes when `editor-picks` is missing

`app/(root)/startup/[id]/page.tsx:20-23` destructures the playlist response:

```ts
const [post, { select: editorPosts }] = await Promise.all([
  client.fetch(STARTUP_BY_ID_QUERY, { id }),
  client.fetch(PLAYLIST_BY_SLUG_QUERY, { slug: "editor-picks" }),
]);
```

If the `editor-picks` playlist does not exist, the second query returns `null`
and destructuring `{ select: editorPosts }` throws. Every startup detail page
then fails, even when the startup itself exists.

The quickstart creates an `editor-picks` playlist to avoid this. A robust fix
would read the playlist into a variable and use `playlist?.select ?? []`.

## 5. `createPitch` does not await the Sanity write

`lib/action.ts:45-54`:

```ts
const result = writeClient.create({
  _type: "startup",
  ...startup,
});

return parseServerActionResponse({
  ...result,
  error: "",
  status: "SUCCESS",
});
```

`writeClient.create` returns a Promise. Spreading it does not include `_id`, so
the success response lacks the new document ID. A rejected write is not caught
by the surrounding `try/catch` because it is never awaited, which can produce an
unhandled rejection. `components/StartupForm.tsx:44` also has the navigation to
`/startup/${result._id}` commented out, so a successful submission stays on the
form and can be submitted again.

Suggested direction: `const result = await writeClient.create(...)` and then
navigate to the returned `_id`.

## 6. Server-side validation is missing

Validation is performed in the client component with
`formSchema.parseAsync` (`components/StartupForm.tsx:34`). The server action
accepts the `FormData` values without validating them again
(`lib/action.ts:22-26`). A direct request can bypass length limits, URL
validation, and the image `HEAD` check. The action also trusts the `pitch`
argument and the session-derived author reference.

Impact: invalid or abusive data can reach Sanity if the action is called outside
the form. Add server-side `formSchema.safeParseAsync` (or an equivalent) and
return field errors without writing.

## 7. Raw error details are returned to the client

`lib/action.ts:55-61` logs the error and returns `JSON.stringify(error)` in the
action response. Sanity or network errors can contain request details, document
IDs, or token-related context. Return a generic user-facing message and keep the
diagnostic in server logs or Sentry.

## 8. Slug field uses the slug value as `_type`

`lib/action.ts:34-37` builds:

```ts
slug: {
  _type: slug,
  current: slug,
},
```

The Sanity slug object normally uses `_type: "slug"` and `current` for the
value. The current code sets `_type` to the generated slug (for example
`"acme-ai"`). This can fail schema validation or produce an inconsistent
document.

## 9. View counter is racy and can become `NaN`

`components/View.tsx:8-18` reads the current count and writes `totalViews + 1`:

- Two concurrent readers can both write the same value, losing increments.
- `views` is optional in the schema and is not initialized when a startup is
  created. A missing value makes `totalViews + 1` equal `NaN`, which may fail
  the patch or store an invalid value.
- The counter runs from a Server Component render, so prefetches, bots, and
  repeated renders can inflate it.
- `after()` defers the write but does not make it atomic.

Suggested direction: initialize `views: 0` on create and use an atomic `inc`
mutation, or a dedicated view event store.

## 10. Image and header hardening is incomplete

`next.config.ts` currently has:

```ts
images: {
  dangerouslyAllowSVG: true,
  remotePatterns: [{ protocol: "https", hostname: "*" }],
}
```

This allows remote SVGs and any HTTPS image host. Startup images are also
rendered with raw `<img>` tags, bypassing `next/image` optimization and its
policy controls. The application does not set a Content-Security-Policy,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or
`Permissions-Policy`. A header check against the live demo on 2026-10-27 found
only Vercel's HSTS header.

Suggested direction: allowlist known image hosts, disable SVG unless required,
render user images through `next/image`, and add security headers with
`headers()` in `next.config.ts`.

## 11. The UI claims voting, but there is no voting feature

`app/(root)/page.tsx:30` says "Submit Ideas, Vote on Pitches, and Get Noticed in
Virtual Competition." `app/layout.tsx:60` uses the description "Pitch, Vote and
Grow". There is no vote field, action, route, or test in the repository.

This documentation pass does not claim voting as a feature. Either add voting or
update the copy in a future product change.

## 12. Sentry example routes are publicly reachable

`sentry-example-page` and `/api/sentry-example-api` are intentionally faulty
diagnostic routes. The API route always throws
(`app/api/sentry-example-api/route.ts:11-13`), and the page exposes Sentry
project links and a button that throws a client-side error. They are useful
during setup but should be removed or gated before production use.

`next.config.ts` also hardcodes the Sentry `org` and `project`. Forking the
project without changing those values sends events to the wrong Sentry project.

## 13. Debug logging of the session ID

`app/(root)/page.tsx:17` calls `console.log(session?.id)`, writing a user
identifier to server logs on every home-page request. Remove it or use
structured, redacted logging.

## 14. Success path leaves the form mounted

As noted in issue 5, the redirect after a successful create is commented out.
The toast appears, but the form remains populated and can be submitted again.
The `state` returned by `useActionState` is not rendered.

## 15. No pagination

`STARTUPS_QUERY` fetches every startup and the home page renders all results.
This is acceptable for a small demo dataset but degrades page size, Sanity query
cost, and render time as content grows. Add cursor or offset pagination.

## 16. Remaining dependency advisories

After applying safe patch updates, `npm audit` reports **62 advisories**:
5 low, 25 moderate, 30 high, and 2 critical. The two critical advisories are
transitive `tar`/`decompress` findings in Sanity/CLI tooling.

Notable direct findings:

- `next` is pinned to a 15.4.2 canary. A stable 15.5.x upgrade is a minor
  framework upgrade and needs its own regression pass.
- `zod` needs a major v4 upgrade to clear its advisory; the application uses the
  v3 API.
- Nested `postcss` copies under `next` and `styled-components` remain flagged
  even though the direct `postcss` dependency is patched.
- `sharp` is pulled in by Next.js and is flagged for libvips/libheif issues.

The audit result changes as advisories are published. Do not run
`npm audit fix --force` without reviewing and testing the breaking upgrades.
This project has not performed a runtime exploitability assessment for each
advisory.

## 17. Local Sentry source-map upload is slow

A local production build with a real `SENTRY_AUTH_TOKEN` took **40.1 minutes**
during the audit. `next.config.ts` enables `widenClientFileUpload`, and Sentry
uploads source maps during the build.

A clean CI-style build with placeholder env values, no Sentry token, and
`--ignore-scripts` took **381.7 seconds (6.4 minutes)** with a 4 GB Node heap.
At Node's default 2 GB heap the same build ran out of memory during compilation.
CI therefore sets `NODE_OPTIONS=--max-old-space-size=4096`.

Keep `SENTRY_AUTH_TOKEN` out of local shells unless source-map upload is needed.
CI intentionally does not receive a token.

## 18. Test coverage is intentionally narrow

There are 19 unit tests covering:

- `lib/validation.ts` valid and invalid payloads, image content types, and
  network failures.
- `lib/utils.ts` class merging, date formatting, and action response cloning.
- `markdown-it` default HTML escaping and `javascript:` link blocking.
- `lib/action.ts` unauthenticated rejection and the authenticated write payload
  with mocked Auth.js and Sanity modules.

Not covered:

- GitHub OAuth end-to-end sign-in.
- A real Sanity write or rollback.
- The create form, toasts, and redirect behavior.
- The startup detail page and playlist fallback.
- The view counter.
- Playwright/Cypress browser tests.

The action test intentionally does not assert the missing `_id` or the
unawaited-write behavior described in issue 5.

## 19. No rate limiting or abuse controls

The server action, auth routes, and public Sentry example API have no
application-level rate limiting. Vercel and GitHub provide some platform-level
protection, but the app itself does not throttle repeated writes or malformed
requests.

## 20. Experimental framework features

The app uses:

- a Next.js **canary** release (`15.4.2-canary.29`);
- `experimental.ppr: "incremental"` and `experimental_ppr` exports;
- `next-sanity` **canary** (`10.1.0-canary.3`);
- Auth.js **beta** (`5.0.0-beta.32`);
- Sanity's experimental Live Content API (`apiVersion: "vX"`).

These are valid for a portfolio project but increase upgrade risk. Treat them as
pinned experimental dependencies rather than a stable long-term platform.

## 21. Build output contains Sentry deprecation warnings

`npm run build` and `npm run lint` print Sentry warnings:

- `withSentryConfig` should be imported from `@sentry/nextjs/config` in v11.
- `disableLogger` is deprecated in favor of
  `webpack.treeshake.removeDebugLogging`.
- `automaticVercelMonitors` is deprecated in favor of
  `webpack.automaticVercelMonitors`.

They do not fail the build today, but should be addressed before a Sentry v11
upgrade.

## 22. Typegen requires real Sanity access

Both `predev` and `prebuild` run:

```bash
sanity schema extract --path=./sanity/extract.json && sanity typegen generate
```

`schema extract` needs a real Sanity project and CLI login/token. In a clean
copy with placeholder values it fails with `CorsOriginError` before Next.js
compiles. CI therefore runs `npm run build --ignore-scripts` and relies on the
committed generated files (`sanity/extract.json` and `sanity/types.ts`).

Vercel deployments with real environment variables can run the normal
`npm run build`, but the build must have Sanity access. If typegen becomes
optional, separate "generate types" from "build" so CI can verify the compile
path without secrets.

## 23. Not-found pages are served with HTTP 200

On the existing demo, requests for unknown documents render the Next.js 404 UI
but return HTTP `200`:

```text
GET /startup/nonexistent-id-123  -> 200 (body contains 404 fallback)
GET /user/nonexistent-id-123     -> 200 (body contains 404 fallback)
```

Both pages use `notFound()` and `experimental_ppr`. The exact cause was not
isolated in this documentation pass; PPR streaming is the likely contributor.
This is a soft-404/SEO issue. Search engines and uptime checks may treat the
missing page as valid content until the response status is corrected.
