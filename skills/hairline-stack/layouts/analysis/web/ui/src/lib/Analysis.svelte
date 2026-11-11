<div class="hl-workspace">
  <main class="hl-workbench-main" id="analysis-main" tabindex="-1">
    <div class="hl-workbench-head">
      <div><h1 class="hl-display-title" id="analysis-title">Cost by team</h1><p class="hl-note" id="analysis-scope">Loading the selected window.</p></div>
      <div class="hl-analysis-actions">
        <button class="hl-button" type="button" id="copy-view">Copy link</button>
        <button class="hl-button" type="button" id="export-svg" disabled>Save SVG</button>
        <button class="hl-button" type="button" id="export-png" disabled>Save PNG</button>
      </div>
    </div>
    <input class="hl-input hl-share-link" id="share-link" aria-label="Shareable view link" readonly hidden />
    <div class="hl-analysis-controls">
      <label class="hl-label" for="analysis-days">Window <select class="hl-select" id="analysis-days"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
      <label class="hl-label" for="analysis-colors">Colors <select class="hl-select" id="analysis-colors"><option value="family">Families</option><option value="vivid">Vivid</option></select></label>
      <span class="hl-note" id="selection-scope"></span>
    </div>
    <p class="app-error" id="analysis-error" role="alert" hidden><span id="analysis-error-text"></span> <button class="hl-button" type="button" id="analysis-retry">Retry</button></p>
    <div class="hl-comparison" id="comparison-values" hidden>
      <div><span id="left-name"></span><strong id="left-share"></strong></div>
      <div><small id="comparison-date"></small><strong id="comparison-lead"></strong><small id="comparison-direction"></small></div>
      <div><span id="right-name"></span><strong id="right-share"></strong></div>
    </div>
    <div class="hl-chart-ranking hl-refreshable">
      <div class="hl-analysis-figure"><svg id="analysis-chart" aria-label="Cost share by team"></svg><p class="hl-analysis-readout" id="analysis-readout"></p></div>
      <div id="analysis-ranking" aria-label="Team ranking"></div>
    </div>
    <p class="hl-note" id="comparison-scope"></p>
    <div id="analysis-notes"></div>
    <div class="hl-sr" id="analysis-live" role="status" aria-live="polite"></div>
  </main>
  <aside class="hl-workbench-rail" id="filter-rail" aria-label="Team filters">
    <div id="filter-content">
      <div class="hl-filter-heading"><h2 id="filter-title">Teams <span id="filter-count"></span></h2><button class="hl-button" type="button" id="filters-reset">Reset</button></div>
      <div class="hl-analysis-actions"><button class="hl-button" type="button" id="filters-all">Select all</button><button class="hl-button" type="button" id="filters-clear">Clear</button></div>
      <div class="hl-filter-options" id="team-filters"></div>
      <p class="hl-note">Selection applies to the share view. Compare always uses the first two teams in the response.</p>
    </div>
  </aside>
</div>
<dialog class="hl-filter-dialog" id="filter-dialog" aria-labelledby="filter-title"><button class="hl-button" type="button" id="filters-done">Done</button></dialog>
