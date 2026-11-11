// The same filter content moves between a desktop rail and a native modal dialog.
export function createFilterRail({ rail, dialog, trigger, content, closeButton, query = "(max-width: 960px)" }) {
  const media = matchMedia(query);
  const controller = new AbortController();
  const on = (node, name, fn) => node.addEventListener(name, fn, { signal: controller.signal });
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-controls", dialog.id);
  trigger.setAttribute("aria-expanded", "false");
  let opener = null;
  const close = () => { if (dialog.open) dialog.close(); };
  on(trigger, "click", () => {
    if (!media.matches) return;
    opener = document.activeElement;
    dialog.insertBefore(content, closeButton);
    dialog.showModal();
    trigger.setAttribute("aria-expanded", "true");
    content.querySelector("button,input,select,[tabindex='0']")?.focus();
  });
  on(closeButton, "click", close);
  on(dialog, "close", () => {
    rail.append(content);
    trigger.setAttribute("aria-expanded", "false");
    const target = media.matches ? opener : content.querySelector("button,input,select");
    target?.focus({ preventScroll: true });
  });
  const resize = () => { if (!media.matches) close(); };
  media.addEventListener("change", resize);
  return { close, destroy() { close(); rail.append(content); controller.abort(); media.removeEventListener("change", resize); } };
}

export function renderDataNotes(host, { source, updatedAt, coverage, estimated = [], methodology = "" } = {}) {
  const doc = host.ownerDocument;
  const make = (tag, text) => { const el = doc.createElement(tag); el.textContent = text; return el; };
  host.classList.add("hl-data-notes");
  const sourceLine = make("span", "Source: ");
  let url;
  try { url = new URL(source?.url); } catch { /* A label alone is useful. */ }
  const label = source?.label || "not supplied";
  if (url && ["https:", "http:"].includes(url.protocol)) {
    const link = make("a", label); link.href = url.href; sourceLine.append(link);
  } else sourceLine.append(doc.createTextNode(label));
  const date = updatedAt ? new Date(updatedAt) : null;
  const freshness = date && Number.isFinite(+date) ? `Updated ${date.toISOString().replace("T", " ").slice(0, 16)} UTC` : "Freshness not supplied";
  const reported = coverage?.reported, total = coverage?.total;
  const known = Number.isFinite(reported) && Number.isFinite(total) && total > 0 && reported >= 0 && reported <= total;
  host.replaceChildren(sourceLine, make("span", freshness), make("span", known ? `${coverage.label || "Coverage"}: ${reported}/${total} (${(100 * reported / total).toFixed(1)}%)` : "Coverage not supplied"));
  if (estimated.length) host.append(make("p", "Estimated intervals: " + estimated.map(({ from, to }) => `${from} – ${to}`).join("; ")));
  if (methodology) {
    const details = doc.createElement("details");
    details.append(make("summary", "Data and methodology"), make("p", methodology));
    host.append(details);
  }
}
