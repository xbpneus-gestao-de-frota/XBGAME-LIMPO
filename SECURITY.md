# Security policy

## Supported version

Security fixes are applied to `3.2.0`, the current release. Earlier releases in the `3.x` line shipped a `dist/` derived from a frozen 2.8 bundle rather than from source, so a fix landing in `client/src` did not necessarily reach what was served; they are not supported. Older prototypes are not supported either, and none of them should be exposed to the internet.

## Reporting a vulnerability

Report suspected vulnerabilities privately to the repository owner. Do not open a public issue containing credentials, personal data, exploit details, or production URLs. Include the affected version, reproduction steps, impact, and any suggested mitigation.

## Deployment baseline

- Use the Node and pnpm versions pinned by this repository.
- Install with `pnpm install --frozen-lockfile` and run `pnpm verify` before release. The gate is `lint`, `build`, `test`, `dist:integrity`, `release:check`, in that order.
- Deploy only a `dist` produced by that build, behind HTTPS. `dist` is now the direct output of `vite build` plus the standalone server — no hand-patched compatibility layer sits between the source and what is served.
- Confirm the deployed tree with `pnpm dist:integrity`. The build records every distributed file in `SHA256SUMS_3.2.0.txt`, and the gate fails on a changed hash, an extra file, a missing file, or a non-regular entry such as a symlink.
- Serve behind HTTPS only. `server/standalone-server.mjs` sends `Strict-Transport-Security: max-age=31536000; includeSubDomains` on every response, alongside CSP, `nosniff`, `X-Frame-Options: DENY`, `no-referrer` and the two same-origin isolation policies. Sending HSTS over plain HTTP is pointless; sending it from a host you do not intend to keep on HTTPS is harmful.
- `server/standalone-server.mjs` is the only server. The unused Express entry point and the `express` dependency were removed in 3.2.0.
- Keep secrets in the hosting provider's secret store; never place them in `VITE_*` variables, source files, build artifacts, or ZIP packages. `release:check` scans every text file in the package for private keys, provider tokens, JWTs, credentialed database URLs and `.npmrc` auth tokens, and blocks the release on a match. It also rejects `.env*` files other than `.env.example`, nested archives, symlinks, unpinned direct dependencies and any Vite older than 7.3.5.
- Keep `/healthz` available to the platform health checker, but do not attach sensitive diagnostics to it.
- Rotate a credential immediately if it is ever copied into source control or a shared artifact.

The secret scan deliberately ignores obvious placeholders — `<...>`, `change-me`, `example`, `seu-` and similar — so that documentation and `.env.example` do not turn the gate into noise that the team learns to skip. A real leak that happens to look like a placeholder would therefore pass; the gate is a backstop, not a substitute for keeping secrets out of the tree.

The application currently has no browser-side feature that requires an API credential.

## Required incident response for older packages

An earlier distribution contained a private environment configuration file. Removing it from this release prevents redistribution, but does not invalidate copies that may already exist. Before reusing any related service, rotate every repository token, platform API key and signing secret that appeared in that older package, then review the corresponding access logs and active sessions.
