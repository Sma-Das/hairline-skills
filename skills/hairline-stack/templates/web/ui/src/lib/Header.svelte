<!-- Markup only. app.js finds these by id and owns the behavior. -->
<header class="hl-header">
  <div class="hl-header-inner">
    <a class="hl-brand" href="#overview">__TITLE__</a>
    <nav class="hl-nav" id="nav" aria-label="Pages">
      <a href="#overview" data-page="overview" aria-current="page">Overview</a>
      <a href="#people" data-page="people">People</a>
    </nav>
    <div class="hl-header-actions">
      <button class="hl-button" type="button" id="palette-open" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K">Search <kbd>⌘K</kbd></button>
      <button class="hl-button" type="button" id="theme-toggle">Light</button>
    </div>
  </div>
</header>
<div class="hl-sr" id="view-live" role="status" aria-live="polite"></div>
