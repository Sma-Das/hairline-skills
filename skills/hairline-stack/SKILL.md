---
name: hairline-stack
description: "Build small Go applications with an embedded Svelte interface, including dashboards and analytical workspaces with shareable view state."
---

# Hairline Stack

Build one coherent application whose API and interface ship together. Prefer a small Go server with an embedded Svelte and Vite build when the project benefits from one binary and a straightforward deployment. Keep the user's domain model, authentication, and data boundaries explicit. The example's subject matter is replaceable.

## Choose the application shape

Start with the person's job. An overview and a searchable directory suit a conventional dashboard. A focused chart, ranked breakdown, persistent filters, and data notes suit an analysis workspace. Choose the shape before adding routes and components; do not turn every screen into the same collection of cards.

Use the bundled scaffold when starting fresh, selecting the dashboard or analysis layout. Preserve an existing application's conventions when extending it. The [architecture guidance](references/architecture.md) explains the scaffold and the boundaries to keep when adapting it.

## Keep responsibilities clear

Let Go own access, validation, bounds, and storage. Leave data a viewer may not see out of the response; hiding it in the interface is not authorization. Give malformed input, missing data, upstream failures, and failed writes explicit results.

Let components own the interface structure. Keep calculations, formatting, request handling, and view-state parsing in focused modules that can be tested independently. Use native platform capabilities before introducing another router, state library, UI kit, or chart dependency. Do not make one rendering pattern a restriction when genuine component-local state is clearer.

Represent money as integer minor units and calendar days as UTC date strings. Use explicit server-supplied provenance and freshness where they matter; a successful fetch is not evidence that the underlying data is current. Preserve missing observations through aggregation and presentation.

## Make navigation and refreshes reliable

Put shareable choices such as the current view, time span, and selected cohort in the URL. Bound and validate them against known options. Distinguish an explicit empty selection from an absent filter. Make Back and Forward restore the view. Keep appearance and private browser preferences out of shared links.

Dedupe identical reads, keep the last good payload during a refetch, and discard responses for a scope the person has already left. A slow request can dim the existing view; it should not replace useful information with an empty screen. Make failure visible and retryable without letting an old request overwrite a newer result.

For analytical views, share one inspection state between chart and ranking. Keep global filters and comparison-specific exceptions explicit. Exports should use the current selection and include the context needed to interpret the saved image.

## Ship one verifiable result

Build the interface before compiling the server that embeds it. Keep the page uncached so releases are picked up, and cache content-addressed assets immutably. Run the production image as a non-root user, bound requests and shutdown time, and retain a restrictive content policy with only the capabilities the interface needs.

Keep generated examples separate from real stores. A preview must not migrate, refresh, or delete production data. Verify the pure calculations, API failure paths, generated build, and complete user flow. Check both appearances, narrow screens, keyboard navigation, and an empty response. Present only the behavior actually verified.
