# Architecture

## Starting a project

Run the bundled `scripts/scaffold.sh <directory> <go-module> [title]` for the ordinary dashboard. Use `scripts/scaffold.sh --layout analysis <directory> <go-module> [title]` for the analytical workspace. Both refuse a non-empty target. Node 22 is required for the generator and interface build.

Install the UI skill beside the stack skill, or set `HAIRLINE_UI`. The analysis layout also needs the charts skill beside it, or `HAIRLINE_CHARTS`. The generator copies the required styles, font, helpers, and chart modules; the generated application has no runtime dependency on the skills' installation paths.

Install the generated interface dependencies once, run its tests and production build, then run Go vet and tests from the application root. The Go embed requires the interface build first. Commit the generated npm lockfile and use `npm ci` thereafter.

## Analytical layout

The analysis variant reads the same bounded summary endpoint as the dashboard. The optional `series` payload contains `{ key, label, family, values, tone? }` with integer cents aligned to `days`. The generated store allocates every day's cost exactly across its invented team series. A real store must supply real series or leave them unavailable; never infer daily distributions from period totals.

Optional `source_label` and `updated_at` describe the underlying observations. `generated_at` describes the response and must not be substituted for source freshness. The empty store supplies no invented provenance.

The workspace includes normalized cost share, a fixed first-two-team comparison, a linked ranking, date and series pinning, a responsive filter dialog, browser-local appearance and color mode, public URL state, and SVG/PNG exports. `analysis-app.js` owns behavior and returns cleanup from `onMount`. The data calculations, family colors, and URL parser remain independently testable modules.

The content policy permits blob images and data fonts for self-contained chart exports. It still restricts resources to the application's own origin by default and denies framing. Keep these capabilities explicit if a deployment tightens its policy further.

## Shape

```
cmd/server/        production entrypoint: env config, real store, graceful shutdown
cmd/sample/        the same handler over generated data, loopback only, for UI work
internal/api/      ServeMux routes, headers, JSON helpers, handler tests
internal/data/     payload types, Store interface, Memory and Sample stores
web/embed.go       //go:embed all:ui/dist, Page() and Asset(name)
web/ui/            Vite + Svelte 5 page
  index.html       body.hl-root, one module script
  src/main.js      CSS import, saved theme and palette before first paint, mount(App)
  src/App.svelte   composes components, calls start() in onMount
  src/lib/*.svelte markup only, elements carry ids
  src/lib/app.js   the imperative half: wire controls, route, load, paint
  src/lib/data.js  createApi, createCache, memoizeIdentity, table derivations
  src/lib/format.js money and dates, pure
  src/lib/router.js hash routes, pure
  src/hairline/    copied from hairline-ui: CSS, font, JS helpers
  test/*.test.js   node --test over the pure modules
Dockerfile         node:22 -> golang:1.22 -> distroless static, nonroot
.github/workflows  npm ci, npm test, npm run build, go vet, go test
```

## Why each choice

- One binary. The Go server embeds the built page, so a deploy is one image and the
  page and API can never be out of step. No CDN, no second service.
- Go 1.22 stdlib `ServeMux` with method patterns (`GET /v1/summary`, `GET /{$}`,
  `GET /assets/{name}`). No router or framework. Wrong methods get 405 for free.
- Svelte 5 for markup only. Components hold structure and ids; plain modules do the
  work. This keeps logic testable with `node --test` and keeps the bundle small
  (the scaffold is ~22 kB gzip of JS). Runes and stores are fine for real reactive
  state; the scaffold shows the plain-module pattern because it scales to a page of
  charts painted from one payload.
- Vite 6 builds static files only. In dev it proxies `/v1` and `/health` to the Go
  server, so the page hot-reloads against real handlers.
- No UI kit, chart library, CSS framework, or state library. hairline-ui provides the
  CSS and the few widgets; charts are hand-built SVG.
- Money is integer cents in Go, in JSON, and in JS until `format.js` writes it.
- Days are UTC `YYYY-MM-DD` strings. The browser never parses them as local time.

## Serving

- `GET /` returns index.html with `Cache-Control: no-store`, so a deploy is picked up
  on the next load.
- `GET /assets/{name}` returns hashed build files with
  `public, max-age=31536000, immutable`. The name may not contain `/` or `..`.
- JSON is `no-store` unless a route has a reason to cache.
- `securityHeaders` sets nosniff, no-referrer, DENY framing, and a same-origin CSP.
- Inputs are bounded in the handler (`days` 1–90), never trusted from the page.
- A missing build answers 503 with the command to fix it, instead of a blank page.

## Data on the page

- `createApi`: GETs to the same path share one request; `clear()` aborts reads in
  flight when the whole view changes; a 401 sends the browser to sign in; errors
  carry the server's `error` text and status.
- `createCache`: LRU with fresh (30s) and keep (5m) deadlines. A fresh hit paints and
  stops; a stale hit paints, then refetches.
- `slowFlag`: a refetch slower than 450ms dims the last figures; fast ones never flicker.
- `memoizeIdentity`: derived rows key on the payload object, so a repaint with the same
  payload and arguments costs nothing and a new payload frees the old results.
- A response for an old window is dropped if the window changed while it was in flight.
- Preferences (theme, palette, window, layout) are localStorage only, read through
  `readPref`/`writePref`, set before first paint where they affect color.

## Routing

`#page` or `#page/<encodeURIComponent(id)>`. `parseHash` falls back to the first page
for anything unknown. Pages are sibling `<section data-page>` elements toggled with
`hidden`, so charts on a hidden page measure 0 and paint when shown (`watchWidth`).

## Sample data

`cmd/sample` serves the real handler over `data.Sample`, a seeded generator with
invented names and `example.com` emails. Same seed, same data, so screenshots compare.
It listens on loopback by default and never opens a real store. If you add a mode that
reads real data for previews, make it read-only, loopback-only, and never write it to
a file that could be committed.

## Testing

- `npm test`: node's built-in runner over `format.js`, `data.js`, `router.js`, and any
  other pure module. No jsdom; keep DOM work in `app.js` and check it in a browser.
- `go test ./...`: handler tests with `httptest` over the Sample store and a fake page:
  cache headers, bounds, 404s, 405s, payload sums.
- CI order matters: `npm run build` runs before `go test`, because `go:embed` needs
  `web/ui/dist` to exist.
- UI check: `go run ./cmd/sample` then a headless browser at 1280 and 390 wide, dark
  and light.

## Growing it

- A real store: implement `data.Store` (Postgres via `pgx`, or an upstream API) and
  construct it in `cmd/server` from env. Keep `Sample` for UI work.
- Auth: wrap protected routes in a middleware that puts the identity in the context;
  return 401 JSON so `createApi` redirects. Never gate in the page alone.
- Admin-only data: decide in the handler and leave it out of the payload, rather than
  hiding it in the page.
- More pages: one Svelte component per page with `data-page`, add it to `pages` in
  `router.js`, and a nav link with `data-page`.
- Background work (syncs, rollups): a goroutine in `cmd/server` with a ticker and a
  lock if more than one task runs; never in the sample command.
