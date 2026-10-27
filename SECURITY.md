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
- The `createPitch` server action, its server-side validation, and its
  author-ownership rules.
- Sanity write-token handling.
- User-supplied Markdown and image URLs.
- The view-count route and its rate limiting.
- Sentry configuration and source-map uploads.
- Security headers and the image host allowlist.

## Existing controls

- Pitch input is validated on the server with Zod before any Sanity write.
- Image URLs must use HTTPS and an allowlisted host, return an `image/*`
  content type, must not be SVG, and must be no larger than 5 MB.
- Markdown is rendered with `markdown-it` with raw HTML disabled.
- `createPitch`, the view route, and the Auth.js routes use in-memory
  fixed-window rate limits.
- Sanity writes are performed only through the server-only write client.
- Responses set CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
- Next.js remote image patterns are restricted to the same allowlist.

Rate limiting is per server instance. Deployments that need a global limit
should use a shared store such as Redis.

## Secrets

The repository must not contain real credentials, tokens, or `.env` files.
Use `.env.example` for variable names and safe placeholders. If a secret is
committed, rotate it immediately and report the location privately.
