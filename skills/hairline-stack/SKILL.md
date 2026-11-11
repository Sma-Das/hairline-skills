---
name: hairline-stack
description: "Scaffold or extend a Go + embedded Svelte 5 dashboard app: one binary, Vite build, no UI libraries."
---

# Hairline stack

A small, dependency-light stack for internal dashboards and desks: a Go 1.22 binary
that serves its API and an embedded Svelte 5 + Vite page, deployed as one distroless
image. It pairs with the `hairline-ui` skill for the look; the scaffold copies that
skill's CSS, font, and JS helpers in.

Use it for a new app, or to bring an existing Go service a page. Keep the user's
domain, data, and names; the template's "spend per person" data is only a stand-in.

## Files

- `scripts/scaffold.sh <dir> <go-module> [title]`: copies `templates/`, fills the
  module, package name, and title, and copies hairline-ui assets into
  `web/ui/src/hairline`. Set `HAIRLINE_UI=/path/to/hairline-ui` if it is elsewhere.
  Refuses a non-empty directory.
- `templates/`: the runnable app. Read it before changing the pattern.
- `references/architecture.md`: layout, why each choice, serving and caching, data
  loading, routing, testing, and how to grow it. Read before extending.
- `references/scaffold.png`: what the scaffold looks like on first run.

## Quick start

```bash
bash /path/to/hairline-stack/scripts/scaffold.sh ./acme example.com/acme/usage "Acme Usage"
cd acme/web/ui && npm install && npm test && npm run build
cd ../.. && go test ./... && go run ./cmd/sample      # http://127.0.0.1:8080
# page work: keep cmd/sample running, then `npm run dev` in web/ui (port 5173, proxies /v1)
```

Use the installed skill’s actual path in place of `/path/to/hairline-stack`.
Install `hairline-ui` alongside `hairline-stack`, or set `HAIRLINE_UI` to its location.

Commit `web/ui/package-lock.json`. Then `npm ci` everywhere else (CI, Docker).

## The stack

- Server: Go 1.22, stdlib only. `net/http` ServeMux method patterns, `log/slog`,
  `//go:embed all:ui/dist`. Graceful shutdown and server timeouts in `cmd/server`.
- Page: Svelte 5 components that own markup only; plain-JS modules with one job each
  (`app.js` wires and paints, `data.js` fetches and caches, `format.js` writes numbers,
  `router.js` reads the hash). Vite 6 static build, dev proxy to the Go server.
- No UI kit, chart library, CSS framework, router, or state library. hairline-ui's
  modules cover selects, tooltips, the command palette, segmented controls, toasts,
  motion, and SVG charts.
- Tests: `node --test` over pure modules, `go test` with `httptest` over handlers.
- Build: multi-stage Dockerfile, node:22-alpine → golang:1.22-alpine → distroless
  static, `CGO_ENABLED=0`, `linux/arm64` by default (`--build-arg TARGETARCH=amd64`),
  user `nonroot`, port 8080.
- CI: `npm ci`, `npm test`, `npm run build`, `go vet`, `go test`. The build must come
  before `go test` because the binary embeds it.

## Rules

- The server is the boundary: bound and validate every input in the handler; leave
  data a viewer may not see out of the payload instead of hiding it in the page.
- `GET /` is `no-store`; hashed `/assets/*` are `immutable` for a year; JSON is
  `no-store` unless a route has a reason.
- Money is integer cents end to end. Dates are UTC `YYYY-MM-DD` strings.
- Same-path GETs dedupe; stale cache paints first; slow refetches dim, never blank.
  A response for a window the viewer already left is dropped.
- Per-browser preferences live in localStorage and never reach the server. Theme and
  palette are applied in `main.js` before mount, so nothing flashes.
- Pages are `<section data-page>` siblings toggled with `hidden`; charts paint via
  `watchWidth`, so a hidden chart waits instead of drawing at width 0.
- Sample data is generated, seeded, invented (`example.com`), and served by its own
  command on loopback. Never point a dev command at a production database.
- Keep components markup-only unless state is genuinely local to one component; put
  logic that can be pure in a module with a node test.
- Add a dependency only when the stdlib or 50 lines will not do, and check its health.

## Checklist

- [ ] `npm test`, `npm run build`, `go vet ./...`, `go test ./...` pass in that order.
- [ ] New routes use method patterns, bounded inputs, and a handler test for the
      failure paths (bad input, wrong method, store error).
- [ ] Cache headers: page `no-store`, assets `immutable`.
- [ ] `cmd/sample` still runs and shows the new page with generated data.
- [ ] Checked in a headless browser at 1280 and 390, dark and light.
- [ ] No secrets, real people's data, or `dist/` committed.
