import "./styles/app.css";
import { mount } from "svelte";
import App from "./App.svelte";

// Set before the first paint, so a saved theme or palette never flashes the default.
try {
  const theme = JSON.parse(localStorage.getItem("app.theme") || "null");
  if (theme === "light") document.body.dataset.theme = "light";
  const palette = JSON.parse(localStorage.getItem("app.palette") || "null");
  if (typeof palette === "string" && palette !== "bronze") document.body.dataset.palette = palette;
} catch { /* nothing saved */ }

mount(App, { target: document.getElementById("app") });
