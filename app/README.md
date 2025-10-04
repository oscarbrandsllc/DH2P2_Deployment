# Dynasty Hub Netlify Bundle

This directory contains everything required to deploy the Dynasty Hub experience on Netlify using only the free tier features.

## Project Layout

```
app/
├── index.html                  # Landing experience
├── rosters/rosters.html        # Roster explorer (largest data consumer)
├── scripts/                    # Shared client-side logic
├── styles/                     # Global styling
├── assets/                     # Logos, icons, and imagery (long-term cached)
├── netlify.toml                # Netlify build, redirect, and cache policy
└── netlify/functions/          # On-demand API proxies and cache controls
```

Everything in this folder can be copied directly into a fresh repository and connected to Netlify. The publish directory should remain the project root (`.`).

## Build & Development

The site ships pre-built static assets, so Netlify's build command can stay empty. For local development you can run the same command that Netlify Dev uses:

```bash
npx serve .
```

## Sleeper API Proxy & Smart Caching

All Sleeper API traffic can be routed through the bundled Netlify Function to take advantage of CDN caching and "stale-while-revalidate" behavior tuned to the NFL calendar.

* **Proxy entry point:** `/api/sleeper/*`
* **Origin:** `https://api.sleeper.app/v1/*`
* **Cache rules:**
  * Sundays, Mondays, Thursdays, Saturdays (late season), and Tuesday mornings receive 15 minute edge caching for roster data.
  * Live state, matchups, and stat endpoints are refreshed as quickly as 30–90 seconds during active windows.
  * Player master data is cached for 12 hours with 6 hour background refresh.
* **Manual refresh:** Append `?fresh=1` to any proxied request to bypass the cache immediately when unexpected mid-week updates land.

The client automatically prefers the proxy whenever it detects a Netlify or localhost environment. To force the proxy on a custom domain, define `window.__DYNHUB_SLEEPER_API_BASE = '/api/sleeper/v1';` before loading the main scripts.

## Static Asset Caching

`netlify.toml` assigns long-lived immutable caching to logos, imagery, JavaScript, and CSS files. Core HTML documents stay on short 2–5 minute revalidation intervals so content updates propagate almost instantly after a redeploy.

## Warmup & Monitoring Ideas

* Hit `/api/sleeper/v1/state/nfl` and `/api/sleeper/v1/players/nfl` with a scheduled Netlify background function (or an external cron) shortly before the Thursday, Sunday, and Monday slates to keep caches hot.
* Use the `?fresh=1` query string on roster pages if you ever need to trigger a manual cache bust without redeploying.
* Add additional proxy functions (e.g., Google Sheets CSV caching) following the same pattern if you find other bottlenecks.

## Deploy Steps Summary

1. Create a new repository and copy this entire `app/` directory into it.
2. Connect the repository to Netlify and leave the build command blank.
3. Set the publish directory to the repository root (`.`).
4. Deploy — the roster page will automatically use the Netlify proxy and caching rules.
