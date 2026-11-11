<script>
  import { onMount } from "svelte";
  import { start } from "./lib/app.js";
  import Header from "./lib/Header.svelte";
  import ContextBar from "./lib/ContextBar.svelte";
  import Overview from "./lib/Overview.svelte";
  import People from "./lib/People.svelte";

  onMount(() => start());
</script>

<a class="hl-skip" href="#main">Skip to content</a>
<Header />
<ContextBar />
<main class="hl-page" id="main">
  <Overview />
  <People />
</main>
