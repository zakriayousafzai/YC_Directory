# Contributing

Thanks for taking a look at YC Directory.

## Setup

1. Install Node.js 22.12 or newer (Node.js 24 is tested; see `.nvmrc`).
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and fill in the values.
4. Follow the Sanity, GitHub OAuth, and playlist notes in the
   [README](README.md#quickstart).
5. Start the app with `npm run dev`.

Never commit `.env`, `.env.local`, or a real token. Use `.env.example` for new
variables.

## Branches and commits

- Branch from `main` and use a short prefix: `feat/`, `fix/`, `docs/`,
  `test/`, or `chore/`.
- Prefer focused commits. Conventional Commit messages are welcome, for
  example `docs: clarify Sanity setup` or `test: cover pitch validation`.
- Keep the product behavior unchanged unless the pull request explicitly
  proposes a behavior change.

## Checks before opening a pull request

Run all of these:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

CI runs the same commands and all steps are blocking. Do not add new lint,
TypeScript, test, or audit failures.

## Pull requests

Include:

- What changed and why.
- The commands you ran and their results.
- Screenshots for visible UI changes.
- Any new environment variable, with a safe placeholder in `.env.example`.
- Any limitation you could not verify.

Do not include secrets, generated build output, or dependency directories in a
pull request.

## Scope

Documentation, test, tooling, and correctness improvements are welcome. If a
pull request changes behavior, say so explicitly and add or update tests for the
affected server action, route, or component.

## Conventions

- Server-side input validation belongs in `lib/validation.ts` and must also be
  enforced in the server action or route handler.
- Image URL rules live in `lib/image-url.ts` and `next.config.ts`; keep the two
  in sync when changing accepted protocols.
- Keep rate-limit keys scoped by action and identity or IP.
- Sanity writes go through `sanity/lib/write-client.ts`; never import the write
  token into client code.
