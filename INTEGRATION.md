# Developer handoff: VSL player and tracking

Source: private vsl-test-site commit `2f52631c9cb43c81c3938a1b9b8cc1f0da452096`. No production repository changes or deployment have been made. Run a static HTTP server (with MP4 Range support for seeking) and open demo.html. Demo uses a 60-second synthetic MP4 and mock destinations; it overrides Lead ownership solely to exercise the optional event.

## Integrate in a development branch of ai-agency-landing

1. Record the current production revision for rollback. Copy this kit's `player/` to the landing repo root. Put Blake's web MP4 at `/player/vsl.mp4` (the existing test repo has the real 720p 91.99 MB file); do not use demo.mp4 in production. Preserve `supabase/`, dashboard.html and dashboard.js for the developer; the dashboard can also be hosted privately. No build dependencies are needed.
2. Edit the one block in `/player/config.js`: `videoUrl: '/player/vsl.mp4'`, `url` is the Supabase project URL, `anonKey` is its PUBLIC anon key, `mock:false` after SQL is ready, `pixel:true` only when site consent/config allows. `pixel:false` suppresses all kit Pixel events, not Supabase. Keep `pageOwnsLead:true` for the current funnel. Keep the default CTA selector or change it to match the page. No service-role key belongs in this file. Use HTTPS, and host player.html on the same origin as the parent so message validation and parent config work. Video may be on a separate HTTPS CDN.
3. In `go/index.html`, replace the entire contents of `div#vsl` (currently the Vidalytics embed div and loader script) with this snippet. Keep the surrounding box and all copy:

```html
<script src="/player/config.js"></script>
<iframe id="vsl-frame" src="/player/player.html"
  title="VSL video" allow="autoplay; fullscreen" allowfullscreen
  style="display:block;width:100%;aspect-ratio:16/9;border:0"></iframe>
<script src="/player/embed.js"></script>
```

Leave `VSL_URL = ""` in the later switches block so it does not overwrite the new frame. The old `vslvid` script already returns when that removed video is absent. Remove any older VSL-specific analytics.js inclusion; this embed owns these events. Keep the existing page Pixel bootstrap/init/PageView and A/B tracking.

4. In the existing registration POST success branch (`if(r.ok||r.status===201||r.status===204||r.status===409)`), before `location.href='/confirm-go/'`, add:

```js
if (window.VSLKit) window.VSLKit.formSubmitted();
```

Do not attach this to `#msend` clicks or native submit: the current page uses a button handler and validation, and unsuccessful requests are not leads. Preserve all CRM, webhook, validation and redirect code. The hook takes no form fields and sends no names, email or phone.

5. Current funnel duplicate check: `go/index.html` fires Pixel PageView only; its `abLog('form_submit')` is a separate A/B database event. `confirm-go/index.html:22` fires `fbq('track','Lead',...)`. Therefore **keep `pageOwnsLead:true`**, so this kit sends form_submit to Supabase but leaves Lead to confirmation. No second PageView is sent. If a different funnel has no existing Lead, set `pageOwnsLead:false`; if moving Lead ownership to this kit, remove the old confirmation Lead in a reviewed change first. The kit cannot deduplicate unrelated third-party scripts automatically.
6. The existing `/go` A/B script may redirect users to `/go-v2/`. Force `?variant=A` during /go testing. The developer must deliberately decide whether to integrate the same kit on variant B before launching; this handoff does not edit either page.

## Supabase setup and verification

Open project `klyiqncsgxcrbdgonaaj` → SQL Editor. Inspect whether `public.vsl_events` and `public.vsl_summary` already exist. If absent, run `supabase/vsl_events.sql` once. It intentionally creates a new table and will fail rather than overwrite an existing one. If already present from J-75, compare the schema/policies instead of running CREATE again. This kit has not executed SQL or made live writes.

RLS grants anon INSERT only, never SELECT. Summary uses security_invoker and authenticated access requires a trusted `app_metadata.vsl_analytics_admin=true` claim. Follow the commented admin-user step in the SQL for a chosen existing admin, then reauthenticate. No public dashboard data or privileged browser keys. Open dashboard.html with the same config; mock mode shows fake data, live mode requires admin sign-in. Keep dashboard access limited to the technical team.

On a staging URL, set mock:false, start playback, unmute, reach each real watch milestone, click CTA and complete a test submission only in a staging backend. Inspect Network POST `/rest/v1/vsl_events` for 201/204 and Table Editor for one of each event per page-load session UUID. Example SQL (admin SQL Editor only):

```sql
select session_id,event,count(*) from public.vsl_events
where created_at > now()-interval '1 hour'
group by session_id,event order by session_id,event;
```

Expect page_view, autoplay_start, unmute_click, watched_25/50/75/100, cta_click, form_submit. Milestones use real watched position, not the decorative progress bar. Each event is attempted once per page load; a reload is a new session. Network delivery is best effort, not guaranteed exactly-once storage; no retries/offline queue are claimed. Anon telemetry is forgeable and may need rate limiting at volume. Referrers/UTMs are recorded; do not put sensitive values in campaign parameters.

## Meta verification

Reuse the page's existing initialized fbq; this kit never loads the SDK or initializes another Pixel. Events are trackCustom VSL_Start (muted autoplay), VSL_Unmute, VSL_25, VSL_50, VSL_75, VSL_100 and VSL_CTA. Lead is standard track, only when the kit owns it. No extra Pixel event for page_view. All calls have stable per-load eventID; no browser/server CAPI dedup is implied.

Meta Events Manager → select the existing Pixel/dataset → Test Events → open the separate staging URL. With permitted consent and pixel:true, perform the journey once, inspect event names and counts. In the current funnel Lead should come only from /confirm-go/. Repeat CTA/form callbacks should not add duplicate kit events in the same page load. Check Pixel Helper and Network for blocked requests. This repo's demo uses mock fbq; it does not prove Meta ingestion. If fbq is absent or pixel:false, calls are skipped. Mount the kit only after the site's consent-controlled Pixel bootstrap is available; late-load event replay is not implemented.

## Player and device checks

Autoplay muted with inline overlay; first surface click restarts at zero and enables sound; later clicks pause/resume. Green controls include rewind10 clamped at zero and speed settings, with arbitrary forward seeking blocked. Progress reaches 85% at45s using quadratic ease-out, then linear to100%; videos ≤45s use linear progress. Mobile Chrome emulation passed; still verify actual iPhone Safari, Low Power Mode, sound, speed, fullscreen/orientation and background/resume. Verify actual production CDN byte-range response206 and mobile loading.

## Rollback

Revert only the integration commit in the landing repo: restore the old div#vsl/loader, remove the two kit scripts and the success hook, restore previous config/Lead ownership if changed. Redeploy that known revision through the existing release process. Do not drop the analytics table or delete data; the new table can remain unused. `pixel:false` is a reversible kit Pixel kill switch and `mock:true` stops kit Supabase writes. Neither changes the page's existing PageView or confirmation Lead.
