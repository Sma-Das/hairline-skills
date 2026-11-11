// Number and date text. Pure, so the node tests can import it. Money arrives as integer
// cents and is only turned into text here.

export function money(cents) {
  const n = Number(cents) || 0;
  const sign = n < 0 ? "-" : "";
  return sign + "$" + (Math.abs(n) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Axis labels: $1,204 and $12.4k. Exact cents stay in the table and tooltip.
export function moneyShort(cents) {
  const dollars = (Number(cents) || 0) / 100;
  const sign = dollars < 0 ? "-" : "";
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000) return sign + "$" + trim(abs / 1_000_000) + "M";
  if (abs >= 10_000) return sign + "$" + trim(abs / 1000) + "k";
  return sign + "$" + abs.toLocaleString("en-US", { maximumFractionDigits: abs >= 100 ? 0 : 2 });
}

function trim(value) {
  return value.toFixed(value >= 100 ? 0 : 1).replace(/\.0$/, "");
}

export function count(value) {
  return (Number(value) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// { dir: "up" | "down" | "none", text } for a delta. No previous value means no claim.
export function change(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev <= 0 || cur === prev) return { dir: "none", text: "" };
  const pct = ((cur - prev) / prev) * 100;
  const rounded = Math.abs(pct) < 1 ? Math.abs(pct).toFixed(1) : Math.round(Math.abs(pct)).toString();
  if (rounded === "0.0") return { dir: "none", text: "" };
  return { dir: pct > 0 ? "up" : "down", text: (pct > 0 ? "+" : "−") + rounded + "%" };
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-03-04" -> "Mar 4". Dates are UTC days and never pass through local time.
export function day(iso) {
  const [, m, d] = String(iso).split("-").map(Number);
  return months[(m || 1) - 1] + " " + (d || 1);
}

export function dayRange(from, to) {
  const year = String(to).slice(0, 4);
  return day(from) + " – " + day(to) + ", " + year;
}
