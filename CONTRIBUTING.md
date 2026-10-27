# Contributing

Thanks for taking a look at YC Directory.

## Setup

1. Install Node.js 24 (see `.nvmrc`).
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

```bash
npm test
npm run build
```

`npm run lint` and `npm run typecheck` are also available, but they currently
fail on `main`. See [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md). Do not add
new lint or TypeScript errors.

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

Documentation, test, and tooling improvements are welcome. The known
correctness and hardening fixes are tracked in
[`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md); if you want to fix one, say so
in the pull request so the behavior change is explicit.
