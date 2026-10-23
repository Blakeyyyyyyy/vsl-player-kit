# VSL player kit

Private developer handoff based on vsl-test-site 2f52631. Start with [INTEGRATION.md](INTEGRATION.md). Nothing is deployed by this repo.

- `player/config.js`: one public configuration block.
- `player/player.html`: responsive green VSL controls.
- `player/embed.js`: Supabase and existing-page Pixel event bridge.
- `demo.html` / `demo.mp4`: offline-safe synthetic demo; mock Supabase and fbq, never real leads.
- `supabase/vsl_events.sql`, `dashboard.html`, `dashboard.js`: INSERT-only public telemetry and admin-only reporting.
- `tests/`: Node tracking transport/ownership tests and numeric progress tests. Run `node tests/tracking.test.cjs` and `node tests/progress.test.cjs`.

No real VSL is bundled. Set the real video URL before integration. Production default leaves Lead with the existing /confirm-go page; the demo overrides that default solely to test kit-owned Lead. Public anon key only; never commit a .env, service-role key or access token.
