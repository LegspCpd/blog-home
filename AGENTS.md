# AGENTS.md

Guidance for AI agents working in this repository.

## Project

Astro blog site (Firefly/Supabase theme). Deploys to Vercel by default, with Cloudflare Pages and pure-static
(EdgeOne) targets selected via the `DEPLOY_TARGET` env var. Production domain: `https://legspcpd.asia`.

## Commands

- `pnpm dev` — local dev server
- `pnpm build` — icons + astro build + pagefind index + IndexNow ping
- `pnpm check` — `astro check` type/diagnostic pass
- `pnpm lint` / `pnpm format` — Biome

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`LegspCpd/blog-home`); read and write them through the plugin's `deck_*` tools rather than raw tracker commands. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary, label strings equal to role names: `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`, plus the `wayfinder:*` set used by `/wayfinder`. See `docs/agents/triage-labels.md`.

### Domain docs

single-context: one root `CONTEXT.md` and ADRs in `docs/adr/`. See `docs/agents/domain.md`.