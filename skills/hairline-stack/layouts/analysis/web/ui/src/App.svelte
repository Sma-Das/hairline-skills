<script>
  import { onMount } from "svelte";
  import { startAnalysis } from "./lib/analysis-app.js";
  import Analysis from "./lib/Analysis.svelte";
  onMount(() => startAnalysis());
</script>

<a class="hl-skip" href="#analysis-main">Skip to content</a>
<div class="hl-analysis-app">
  <header class="hl-header">
    <div class="hl-header-inner">
      <a class="hl-brand" href="/">__TITLE__</a>
      <nav class="hl-analysis-tabs" aria-label="Analysis views">
        <a class="hl-button" href="?chart=share" id="share-view">Share</a>
        <a class="hl-button" href="?chart=balance" id="balance-view">Compare</a>
      </nav>
      <div class="hl-header-actions">
        <button class="hl-button" type="button" id="analysis-theme">Light</button>
        <button class="hl-button hl-mobile-filters" type="button" id="filters-open">Filters <span id="mobile-filter-count"></span></button>
      </div>
    </div>
  </header>
  <Analysis />
</div>
