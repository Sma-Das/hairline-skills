// Hash routes: #page or #page/<encoded id>. The page lives in the URL, so Back works
// and a link can be shared. Pure, so node --test covers it.

export const pages = ["overview", "people"];

export function parseHash(hash, known = pages) {
  const raw = String(hash || "").replace(/^#/, "");
  const [head, ...rest] = raw.split("/");
  const page = known.includes(head) ? head : known[0];
  let id = null;
  if (page === head && rest.length) {
    try { id = decodeURIComponent(rest.join("/")); } catch { id = null; }
  }
  return { page, id };
}

export function hashFor(page, id) {
  return "#" + page + (id != null ? "/" + encodeURIComponent(id) : "");
}
