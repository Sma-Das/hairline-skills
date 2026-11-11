// Command palette: Cmd or Ctrl+K, or /, from anywhere. Builds its own <dialog>.
// Items come from data this viewer already has, so it never offers a page or a record
// they could not open.
//
// item: { label, group, run(), keywords?, hint?, icon?(), quick?, rank? }
// `quick` items show when the query is empty. Results keep the order of their groups.
import { el, icon } from "./ui.js";

// Letters in order, in a word. Lower is better. Null means no match.
export function matchScore(query, text) {
  const q = String(query || "").trim().toLowerCase();
  const t = String(text || "").toLowerCase();
  if (!q) return 0;
  const direct = t.indexOf(q);
  if (direct === 0) return 0;
  if (direct > 0) return /[\s@._/-]/.test(t[direct - 1]) ? 1 : 2 + direct / 100;
  let at = -1;
  let gaps = 0;
  for (const ch of q) {
    if (ch === " ") continue;
    const next = t.indexOf(ch, at + 1);
    if (next < 0) return null;
    if (at >= 0) gaps += next - at - 1;
    at = next;
  }
  // Letters scattered across a long label are a coincidence, not a match.
  if (gaps > q.length * 2) return null;
  return 10 + gaps;
}

export function createPalette({ items, placeholder = "Jump to…", root = document.body }) {
  const dialog = el("dialog", "hl-palette");
  dialog.setAttribute("aria-label", "Command palette");
  const field = el("label", "hl-palette-field");
  field.appendChild(icon("search", 16));
  const input = el("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("aria-controls", "hl-palette-list");
  field.appendChild(input);
  const list = el("ul", "hl-palette-list");
  list.id = "hl-palette-list";
  list.setAttribute("role", "listbox");
  dialog.append(field, list);
  root.appendChild(dialog);

  let results = [];
  let active = 0;
  let opener = null;

  function search() {
    const query = input.value.trim();
    const all = items();
    if (!query) results = all.filter((item) => item.quick).slice(0, 12);
    else {
      results = all.map((item) => {
        const score = matchScore(query, item.label + " " + (item.keywords || ""));
        return score == null ? null : { item, score };
      }).filter(Boolean).sort((a, b) => a.score - b.score || (a.item.rank || 0) - (b.item.rank || 0)).slice(0, 30).map((row) => row.item);
    }
    active = 0;
    paint();
  }

  function paint() {
    list.replaceChildren();
    if (!results.length) {
      const none = el("li", "hl-palette-none", "Nothing matches.");
      none.setAttribute("role", "presentation");
      list.appendChild(none);
      input.removeAttribute("aria-activedescendant");
      return;
    }
    let group = null;
    results.forEach((item, index) => {
      if (item.group !== group) {
        group = item.group;
        if (group) {
          const head = el("li", "hl-palette-group", group);
          head.setAttribute("role", "presentation");
          list.appendChild(head);
        }
      }
      const li = el("li", "hl-palette-item");
      li.id = "hl-palette-item-" + index;
      li.setAttribute("role", "option");
      if (item.icon) li.appendChild(item.icon());
      li.appendChild(el("span", "hl-palette-label", item.label));
      if (item.hint) li.appendChild(el("span", "hl-palette-hint", item.hint));
      li.addEventListener("pointermove", () => { if (active !== index) { active = index; syncActive(); } });
      li.addEventListener("click", () => run(item));
      list.appendChild(li);
    });
    syncActive();
  }

  function syncActive() {
    list.querySelectorAll(".hl-palette-item").forEach((li) => {
      const on = li.id === "hl-palette-item-" + active;
      li.setAttribute("aria-selected", on ? "true" : "false");
      if (on) { input.setAttribute("aria-activedescendant", li.id); li.scrollIntoView({ block: "nearest" }); }
    });
  }

  function run(item) { close(); item.run(); }

  function open() {
    if (dialog.open) return;
    opener = document.activeElement;
    input.value = "";
    search();
    dialog.showModal();
    input.focus();
  }

  function close() {
    if (dialog.open) dialog.close();
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }

  input.addEventListener("input", search);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      syncActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) run(results[active]);
    }
  });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
  document.addEventListener("keydown", (e) => {
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (dialog.open) close(); else open();
    } else if (e.key === "/" && !typing && !document.querySelector("dialog[open]")) {
      e.preventDefault();
      open();
    }
  });
  return { open, close, dialog };
}
