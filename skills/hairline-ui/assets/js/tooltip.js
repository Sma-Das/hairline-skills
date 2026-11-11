// One tooltip for every chart. It enhances and never gates: each value it shows
// is also in a table or a label on the page. Text goes in through textContent,
// because series names come from the API.

let box = null;
let hideTimer = 0;

function ensure() {
  if (box) return box;
  box = document.createElement("div");
  box.className = "hl-tip";
  box.setAttribute("role", "tooltip");
  box.hidden = true;
  document.body.appendChild(box);
  return box;
}

export function showTip(content, x, y) {
  const el = ensure();
  clearTimeout(hideTimer);
  // The dialog top layer would cover a tooltip that lives on the body.
  const open = document.querySelector("dialog[open]");
  const home = open && !open.classList.contains("hl-palette") ? open : document.body;
  if (el.parentElement !== home) home.appendChild(el);
  el.replaceChildren(...(Array.isArray(content) ? content : [content]));
  el.hidden = false;
  placeTip(x, y);
  el.classList.add("is-in");
}

export function placeTip(x, y) {
  const el = ensure();
  const gap = 14;
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + gap;
  let top = y + gap;
  if (left + rect.width > vw - 8) left = x - rect.width - gap;
  if (top + rect.height > vh - 8) top = y - rect.height - gap;
  el.style.transform = `translate(${Math.round(Math.max(8, left))}px, ${Math.round(Math.max(8, top))}px)`;
}

export function hideTip() {
  if (!box) return;
  box.classList.remove("is-in");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (box) box.hidden = true; }, 120);
}

// Shows build() for this element on hover and on keyboard focus.
export function bindTip(el, build) {
  el.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "touch") return;
    showTip(build(), e.clientX, e.clientY);
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch") placeTip(e.clientX, e.clientY);
  });
  el.addEventListener("pointerleave", hideTip);
  el.addEventListener("focus", () => {
    if (!el.matches(":focus-visible")) return;
    const r = el.getBoundingClientRect();
    showTip(build(), r.left + Math.min(r.width / 2, 120), r.top + Math.min(r.height / 2, 40));
  });
  el.addEventListener("blur", hideTip);
}

export function tipTitle(text, sub) {
  const head = document.createElement("div");
  head.className = "hl-tip-title";
  head.textContent = text;
  if (sub) {
    const s = document.createElement("span");
    s.textContent = sub;
    head.appendChild(s);
  }
  return head;
}

// Value first, then the label. A short stroke keys the row to its series.
export function tipRow(value, label, color) {
  const row = document.createElement("div");
  row.className = "hl-tip-row";
  if (color) {
    const key = document.createElement("i");
    key.style.background = color;
    row.appendChild(key);
  }
  const v = document.createElement("strong");
  v.textContent = value;
  const l = document.createElement("span");
  l.textContent = label;
  row.append(v, l);
  return row;
}
