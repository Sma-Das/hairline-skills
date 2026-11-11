// A drop-down in the page's own style, in place of the browser's. The native <select>
// stays in the page, hidden and inert, as the source of truth: its options are what
// the list shows, its value is what a form submits, and a "change" event fires on it
// when someone picks. Code that reads or sets select.value, or fires change, keeps
// working. After setting select.value from code, call the refresh() this returns.
//
// The trigger follows the select-only combobox pattern: focus stays on it, the arrow
// keys move through the list, Enter or Space picks, Escape closes, and typing jumps.
import { enter } from "./motion.js";
import { el, icon } from "./ui.js";

const TYPE_AHEAD_MS = 700;
let serial = 0;

// The index of the enabled option a typed query jumps to, or -1. One letter, or one
// letter repeated, looks after `from` and wraps, so pressing it again moves to the
// next option with that letter. A longer query looks from `from` itself, so it can
// stay put while more letters narrow it. `from` is -1 when nothing is chosen.
export function findMatch(labels, disabled, query, from) {
  const q = query.toLowerCase();
  const n = labels.length;
  if (!q || !n) return -1;
  const repeated = q.length > 1 && [...q].every((c) => c === q[0]);
  const needle = repeated ? q[0] : q;
  const after = needle.length === 1;
  const start = from < 0 ? (after ? -1 : 0) : from;
  for (let step = after ? 1 : 0; step < n + (after ? 1 : 0); step++) {
    const i = (((start + step) % n) + n) % n;
    if (!disabled[i] && labels[i].toLowerCase().startsWith(needle)) return i;
  }
  return -1;
}

// What the field is called, for the trigger: the select's own label, or the text of the
// <label> that wraps it without the select's options.
function nameOf(select) {
  const own = select.getAttribute("aria-label");
  if (own) return own;
  const label = select.closest("label");
  if (!label) return "";
  const copy = label.cloneNode(true);
  copy.querySelectorAll("select, .hl-csel").forEach((node) => node.remove());
  return copy.textContent.replace(/\s+/g, " ").trim();
}

// variant "bar" is the quiet text control for the row above the page. The default is a
// form field with an underline.
export function enhanceSelect(select, { variant = "" } = {}) {
  if (!select || select.csel) return select && select.csel;
  const id = "hl-csel-" + ++serial;
  const wrapper = el("div", "hl-csel" + (variant ? " hl-csel-" + variant : ""));
  const trigger = el("button", "hl-csel-trigger");
  trigger.type = "button";
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", id + "-list");
  const text = el("span", "hl-csel-text");
  trigger.append(text, icon("chevron", 14));
  const list = el("ul", "hl-csel-list");
  list.id = id + "-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  // The wrapper may sit in a <label>, which clicks its control for any click inside it.
  // That would reopen the list right after a pick. Cancelling the click stops it.
  list.addEventListener("click", (e) => e.preventDefault());
  // Pressing an option must not pull focus off the trigger, or the list closes
  // on focusout before the click lands.
  list.addEventListener("mousedown", (e) => e.preventDefault());
  const name = nameOf(select);
  if (name) {
    trigger.setAttribute("aria-label", name);
    list.setAttribute("aria-label", name);
  }

  select.before(wrapper);
  wrapper.append(trigger, list, select);
  // Hidden from sight and from the tab order. It is still in the form.
  select.classList.add("hl-csel-native");
  select.inert = true;

  let items = [];
  let active = -1;
  let query = "";
  let queryTimer = 0;

  const isOpen = () => !list.hidden;
  const listed = () => [...select.options].filter((o) => !o.hasAttribute("data-placeholder"));

  function paintTrigger() {
    const chosen = select.selectedOptions[0];
    text.textContent = chosen ? chosen.textContent : "";
    text.classList.toggle("is-placeholder", !chosen || chosen.hasAttribute("data-placeholder"));
  }

  function build() {
    const options = listed();
    list.replaceChildren();
    items = options.map((option, i) => {
      const li = el("li", "hl-csel-option", option.textContent);
      li.id = id + "-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", option.selected ? "true" : "false");
      if (option.disabled) li.setAttribute("aria-disabled", "true");
      li.addEventListener("pointermove", () => { if (!option.disabled) setActive(i, false); });
      li.addEventListener("click", () => { if (!option.disabled) choose(i); });
      list.appendChild(li);
      return { option, li };
    });
  }

  function setActive(index, scroll = true) {
    active = index;
    items.forEach((item, i) => item.li.toggleAttribute("data-active", i === index));
    if (index < 0) trigger.removeAttribute("aria-activedescendant");
    else {
      trigger.setAttribute("aria-activedescendant", items[index].li.id);
      if (scroll) items[index].li.scrollIntoView({ block: "nearest" });
    }
  }

  const enabledFrom = (start, step) => {
    for (let i = start; i >= 0 && i < items.length; i += step) if (!items[i].option.disabled) return i;
    return -1;
  };

  function place() {
    list.removeAttribute("data-side");
    list.removeAttribute("data-align");
    const box = trigger.getBoundingClientRect();
    const below = window.innerHeight - box.bottom - 8;
    if (list.offsetHeight > below && box.top > below) list.setAttribute("data-side", "up");
    if (list.getBoundingClientRect().right > window.innerWidth - 8) list.setAttribute("data-align", "end");
  }

  function open() {
    if (isOpen() || select.disabled || !items.length) return;
    list.hidden = false;
    wrapper.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    place();
    enter(list, { y: list.getAttribute("data-side") === "up" ? -4 : 4, duration: 140 });
    const chosen = items.findIndex((item) => item.option.selected);
    setActive(chosen >= 0 ? chosen : enabledFrom(0, 1));
  }

  function close(returnFocus = false) {
    if (!isOpen()) return;
    list.hidden = true;
    wrapper.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    setActive(-1);
    if (returnFocus) trigger.focus();
  }

  function choose(index) {
    const { option } = items[index];
    close(true);
    if (select.value === option.value) return;
    select.value = option.value;
    refresh();
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function refresh() {
    build();
    paintTrigger();
    wrapper.hidden = select.hidden;
    trigger.disabled = select.disabled;
    if (isOpen()) {
      if (!items.length) close();
      else setActive(Math.min(Math.max(active, 0), items.length - 1), false);
    }
  }

  function typeAhead(char) {
    query += char;
    clearTimeout(queryTimer);
    queryTimer = setTimeout(() => { query = ""; }, TYPE_AHEAD_MS);
    const from = active >= 0 ? active : items.findIndex((item) => item.option.selected);
    const hit = findMatch(items.map((i) => i.li.textContent), items.map((i) => i.option.disabled), query, from);
    if (hit < 0) return;
    if (isOpen()) setActive(hit);
    else choose(hit);
  }

  trigger.addEventListener("click", () => (isOpen() ? close() : open()));
  trigger.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!isOpen()) { open(); return; }
        const next = enabledFrom(active + (e.key === "ArrowDown" ? 1 : -1), e.key === "ArrowDown" ? 1 : -1);
        if (next >= 0) setActive(next);
        return;
      }
      case "Home":
      case "End":
        if (!isOpen()) return;
        e.preventDefault();
        setActive(e.key === "Home" ? enabledFrom(0, 1) : enabledFrom(items.length - 1, -1));
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!isOpen()) open();
        else if (active >= 0) choose(active);
        return;
      case "Escape":
        if (!isOpen()) return;
        e.preventDefault();
        e.stopPropagation();
        close(true);
        return;
      case "Tab":
        close();
        return;
      default:
        if (e.key.length === 1) {
          e.preventDefault();
          // Typing here is not a shortcut for the page, such as "/" for search.
          e.stopPropagation();
          typeAhead(e.key);
        }
    }
  });
  wrapper.addEventListener("focusout", (e) => {
    if (!wrapper.contains(e.relatedTarget)) close();
  });
  document.addEventListener("pointerdown", (e) => {
    if (isOpen() && !wrapper.contains(e.target)) close();
  });
  // A form reset puts the native value back after this event, so look then.
  if (select.form) select.form.addEventListener("reset", () => setTimeout(refresh, 0));
  // Options and the hidden or disabled state may change from code at any time.
  new MutationObserver(refresh).observe(select, {
    childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden", "disabled"]
  });

  refresh();
  const api = { refresh, open, close, trigger, wrapper };
  select.csel = api;
  return api;
}
