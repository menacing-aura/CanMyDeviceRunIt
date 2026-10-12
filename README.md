# CanMyDeviceRunIt

A compatibility checker for the device you already have. Compare specific PCs, Android phones, Macs, and Chromebooks with published game and application requirements; enter your own specifications when a catalog configuration does not match. An optional Groq-powered helper explains a comparison; live web search is not enabled yet.

## Run locally

Use Node.js 22 or later and install the project dependencies:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Set `PORT` to change the port. This lightweight development server serves the static app; to run the Pages Function locally, copy `.dev.vars.example` to `.dev.vars`, put your Groq API key in `.dev.vars`, then run:

```sh
npm run cf:dev
```

Wrangler serves the app and `/api/assistant` at http://localhost:8788. `.dev.vars` is ignored by Git. Never put the key in browser code, `wrangler.toml`, or a committed file.

```sh
npm test
npm run build
npm run preview
npm run check
```

`npm test` checks compatibility rules, the assistant endpoint, generated page content, escaping, and server file-access boundaries. `npm run build` creates `dist/`; `npm run preview` serves that build. `npm run check` performs JavaScript syntax checks, tests, and a build.

## Cloudflare Pages

The site is static HTML/CSS/JS plus one server-side Pages Function at `/api/assistant`. The Groq key stays in Cloudflare and is never sent to the browser. Hosting, Cloudflare plan limits, and Groq usage/pricing are subject to their current terms; no hosting service or deployment has been created by this repository setup.

Connect this repository to Cloudflare Pages and configure:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | 22 or later |
| Root directory | `/` |

The root-level `functions/` directory is intentionally outside `dist/`; Cloudflare Pages discovers it during deployment. `wrangler.toml` sets the output directory and runtime compatibility date. In the Pages project dashboard, add `GROQ_API_KEY` as an encrypted secret for both production and preview environments, then redeploy. Do not configure this key as a public build variable. `GROQ_MODEL` is a non-secret model setting and defaults to `openai/gpt-oss-120b`.

Before enabling the helper on a public site, create a Cloudflare rate-limiting rule for `POST /api/assistant` (for example, 8 requests per IP per minute with a one-minute block). This endpoint uses your Groq account and the rate-limiting features available to your Cloudflare plan; without a rule, visitors can consume your account's API quota.

After you know the public address, optionally set the build environment variable `SITE_URL` to its origin, such as `https://your-project.pages.dev`, and rebuild. Use only the origin, with no path, query, credentials, or fragment. The build then includes canonical URLs and `sitemap.xml`. Without `SITE_URL`, no domain is invented and `robots.txt` omits a sitemap declaration.

Every catalog game, device, and device/game comparison has a generated HTML page with a unique title, description, and readable initial content. The browser application adds interactive selection and custom specifications. `404.html` provides the hosting fallback for unknown paths. `public/_headers` is copied for hosts that support Cloudflare/Netlify-style header files; other hosts need equivalent header configuration. The local server serves only recognized routes and public JS, CSS, and media files.

## Data and estimate limits

`src/catalog.js` contains explicit hardware configurations, supported platforms, requirements, publisher/manufacturer source links, notes, and the review date. `src/compatibility.js` compares those records. Update both the source notes and review date when refreshing facts, and rerun the tests.

Processor and graphics tiers are editorial comparisons, not measured benchmarks. Ratings and the fit index are not FPS predictions, probabilities, or installation guarantees. Unknown requirements stay unknown. OS versions, drivers, graphics features, firmware/anti-cheat restrictions, store availability, and individual hardware variants still need verification. Mobile heat limits, mods, large game worlds, rendering workloads, and extensions can change performance substantially.

Total storage capacity is never treated as available space. Only an entered free-space value can pass the storage check. Unsupported native platforms are identified explicitly; cloud streaming, emulation, browser editions, Linux containers, and older software releases are outside these comparisons.

## Privacy and assets

Custom device specifications and remembered selections are stored in the current browser. When you submit an AI question, the question and current device/game/comparison details are sent through the Cloudflare Pages Function to Groq; this app does not store the prompt or response. The AI helper does not currently have live web search and may be inaccurate. Cloudflare and Groq may process request data under their own terms. There are no accounts, hardware scans, analytics, or app database. Clear this site's browser data to remove saved values. Opening an external source link is subject to that site's privacy practices.

Artwork and trademarks remain the property of their respective owners. See `public/assets/ASSETS.md` for image provenance. CanMyDeviceRunIt is an independent guide and does not imply publisher or manufacturer endorsement.
