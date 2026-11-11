// Only public view choices go in a URL. Appearance and private preferences stay local.
export function parseViewState(search, { charts = ["share", "balance"], days = [7, 30, 90], groups = [], defaultChart = charts[0], defaultDays = 30 } = {}) {
  const params = new URLSearchParams(search);
  const requestedDays = Number(params.get("days"));
  const requestedGroups = new Set(params.getAll("group"));
  return {
    chart: charts.includes(params.get("chart")) ? params.get("chart") : defaultChart,
    days: days.includes(requestedDays) ? requestedDays : days.includes(defaultDays) ? defaultDays : days[0],
    // A present but empty group parameter is an explicit empty selection.
    groups: params.has("group") ? groups.filter((key) => requestedGroups.has(key)) : [...groups],
  };
}

export function viewQuery(state, options = {}) {
  const params = new URLSearchParams();
  params.set("chart", state.chart);
  params.set("days", String(state.days));
  for (const group of state.groups || []) params.append("group", group);
  if (!state.groups?.length) params.append("group", "");
  const normalized = parseViewState(params, options);
  const out = new URLSearchParams({ chart: normalized.chart, days: String(normalized.days) });
  for (const group of normalized.groups) out.append("group", group);
  if (!normalized.groups.length) out.append("group", "");
  return out.toString();
}

export function viewURL(href, state, options) {
  const url = new URL(href);
  for (const key of ["chart", "days", "group"]) url.searchParams.delete(key);
  for (const [key, value] of new URLSearchParams(viewQuery(state, options))) url.searchParams.append(key, value);
  return url.href;
}
