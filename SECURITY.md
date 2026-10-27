# Security policy

## Supported versions

Only the latest commit on the `main` branch is supported. This is a portfolio
project and does not maintain versioned release branches.

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include reproduction steps, affected routes or files, and the impact.

If private reporting is unavailable, contact the maintainer through their
GitHub profile. Do not include credentials, tokens, or personal data in a
report.

## Scope

Security-sensitive areas include:

- GitHub OAuth and session handling.
- The `createPitch` server action and its author ownership rules.
- Sanity write-token handling.
- User-supplied Markdown and image URLs.
- Sentry configuration and source-map uploads.

## Secrets

The repository must not contain real credentials, tokens, or `.env` files.
Use `.env.example` for variable names and safe placeholders. If a secret is
committed, rotate it immediately and report the location privately.

## Known limitations

The project currently has documented correctness and hardening gaps. See
[`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) before reporting a known issue.
