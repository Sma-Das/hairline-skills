// A calendar of days: one column per week, Sunday on top, one hue from dim to bright.
// Days not yet stored are hollow, so an empty future never reads as a day with nothing.
// The squares fade in once, the first time the calendar is seen. A year is wider than
// a phone, so the strip opens scrolled to its newest end.
import { reduced } from "./motion.js";
import { hideTip, showTip, tipRow, tipTitle } from "./tooltip.js";

const DAY = 86400000;
const utc = (iso) => new Date(iso + "T00:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDay = (s) => { const d = utc(s); return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate(); };

// Four steps of the day's share of the busiest day. Zero is its own step, never level 1.
export function levelOf(value, max) {
  return value > 0 ? Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) : 0;
}

// Weeks of seven, padded with null outside the first and last day.
export function weeksOf(days) {
  if (!days.length) return [];
  const start = utc(days[0].day), end = utc(days[days.length - 1].day);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const cursor = new Date(start.getTime() - start.getUTCDay() * DAY);
  const weeks = [];
  while (cursor <= end) {
    const week = [];
    for (let row = 0; row < 7; row++) {
      const t = cursor.getTime();
      week.push(t < start.getTime() || t > end.getTime() ? null : byDay.get(iso(cursor)) || { day: iso(cursor), value: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// A month label where its first week starts, only when it has two columns of room.
function monthLabels(weeks) {
  const raw = [];
  let prev = -1;
  weeks.forEach((week, col) => {
    const first = week.find(Boolean);
    if (!first) return;
    const sunday = new Date(utc(first.day).getTime() - week.indexOf(first) * DAY);
    if (sunday.getUTCMonth() === prev) return;
    prev = sunday.getUTCMonth();
    raw.push({ col, name: MONTHS[prev] });
  });
  return raw.filter((m, i) => (raw[i + 1] ? raw[i + 1].col : weeks.length) - m.col >= 2);
}

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

// days: [{ day: "YYYY-MM-DD", value, future? }], any order. breakdown(day) -> [{ label, value, color }] for the tooltip.
export function paintHeatmap(host, days, { format = (v) => v.toLocaleString("en-US"), name = "", breakdown = null, words = {} } = {}) {
  const w = { less: "Less", more: "More", ahead: "Not yet", none: "Nothing in this window.", busiest: "Busiest day", ...words };
  const sorted = (days || []).filter((d) => d && d.day).slice().sort((a, b) => (a.day < b.day ? -1 : 1));
  const stored = sorted.filter((d) => !d.future);
  host.classList.add("hl-cal");
  host.replaceChildren();
  const grid = node("div", "hl-cal-grid");
  [["Mon", 3], ["Wed", 5], ["Fri", 7]].forEach(([label, row]) => {
    const n = node("span", "hl-cal-dow", label);
    n.style.gridRow = String(row);
    grid.appendChild(n);
  });
  const weeks = weeksOf(sorted);
  host.style.setProperty("--weeks", String(Math.max(1, weeks.length)));
  monthLabels(weeks).forEach((m) => {
    const n = node("span", "hl-cal-month", m.name);
    n.style.gridColumn = String(m.col + 2);
    grid.appendChild(n);
  });
  const max = Math.max(1, ...stored.map((d) => Number(d.value) || 0));
  const peak = stored.reduce((best, d) => ((Number(d.value) || 0) > (Number(best?.value) || 0) ? d : best), stored[0]);
  const latest = stored[stored.length - 1]?.day;
  weeks.forEach((week, col) => week.forEach((day, row) => {
    const cell = node("i");
    cell.style.gridColumn = String(col + 2);
    cell.style.gridRow = String(row + 2);
    cell.style.setProperty("--col", String(col));
    if (!day) cell.dataset.pad = "";
    else if (day.future) cell.dataset.future = "";
    else {
      const v = Number(day.value) || 0;
      const level = levelOf(v, max);
      if (level) cell.dataset.level = String(level);
      cell.dataset.day = day.day;
      cell.dataset.value = String(v);
      if (day.day === latest) cell.dataset.latest = "";
    }
    grid.appendChild(cell);
  }));

  const legend = node("div", "hl-cal-legend");
  if (sorted.length > stored.length) {
    const ahead = node("i");
    ahead.dataset.future = "";
    legend.append(ahead, node("span", "hl-cal-ahead", w.ahead));
  }
  legend.append(node("span", "", w.less), node("i"));
  for (let level = 1; level <= 4; level++) { const s = node("i"); s.dataset.level = String(level); legend.appendChild(s); }
  legend.appendChild(node("span", "", w.more));

  // The summary is the accessible name, so the busiest day is reachable without a pointer.
  const summary = stored.length ? `${stored[0].day} through ${latest}. ${w.busiest} ${peak.day}, ${format(Number(peak.value) || 0)}.` : w.none;
  host.setAttribute("role", "img");
  host.setAttribute("aria-label", name ? name + ". " + summary : summary);
  const meta = node("div", "hl-cal-meta");
  if (stored.length) meta.append(node("span", "", shortDay(stored[0].day)), node("span", "", shortDay(latest)));
  host.append(grid, meta, legend);

  if (!host._tipBound) {
    host._tipBound = true;
    const tip = (e) => {
      const cell = e.target.closest?.("i[data-day]");
      if (!cell) { hideTip(); return; }
      const parts = [tipTitle(shortDay(cell.dataset.day)), tipRow(format(Number(cell.dataset.value)), "")];
      (host._breakdown?.(cell.dataset.day) || []).forEach((r) => parts.push(tipRow(format(r.value), r.label, r.color)));
      showTip(parts, e.clientX, e.clientY);
    };
    host.addEventListener("pointermove", tip);
    host.addEventListener("pointerdown", tip);
    host.addEventListener("pointerleave", hideTip);
  }
  host._breakdown = breakdown;

  if (!host.dataset.painted && !reduced()) {
    host.dataset.painted = "1";
    host.classList.add("is-filling");
    setTimeout(() => host.classList.remove("is-filling"), 1100);
  }
  requestAnimationFrame(() => { host.scrollLeft = host.scrollWidth; });
}
