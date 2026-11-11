// Missing observations and all-zero days are gaps, not invented 0% observations.
const observed = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function shareData(series, length = series[0]?.values.length || 0) {
  const keys = new Set();
  for (const row of series) {
    if (typeof row.key !== "string" || !row.key || keys.has(row.key)) throw new TypeError("Series keys must be non-empty strings and unique.");
    if (!Array.isArray(row.values) || row.values.length !== length) throw new TypeError("Every series must align with the dates.");
    keys.add(row.key);
  }
  const totals = Array.from({ length }, (_, index) => {
    if (!series.length || series.some((row) => !observed(row.values[index]))) return null;
    const sum = series.reduce((total, row) => total + row.values[index], 0);
    return sum > 0 && Number.isFinite(sum) ? sum : null;
  });
  return {
    totals,
    completeDays: totals.filter((value) => value != null).length,
    series: series.map((row) => ({ ...row, raw: [...row.values], values: row.values.map((value, index) => totals[index] == null ? null : 100 * (value / totals[index])) })),
  };
}

// Period share is weighted by observed volume; it is not a mean of daily percentages.
export function rankShares(data, index = null) {
  const days = data.totals.flatMap((total, i) => total == null ? [] : [i]);
  const sum = index == null ? days.reduce((total, i) => total + data.totals[i], 0) : data.totals[index];
  return data.series.map((row) => {
    const value = index == null ? days.reduce((total, i) => total + row.raw[i], 0) : sum == null ? null : row.raw[index];
    const share = sum > 0 ? 100 * value / sum : null;
    const changePp = index == null && days.length > 1 ? row.values[days.at(-1)] - row.values[days[0]] : null;
    return { ...row, value: sum > 0 ? value : null, share, changePp };
  }).sort((a, b) => (b.share ?? -1) - (a.share ?? -1) || a.key.localeCompare(b.key));
}

export function balanceData(left, right) {
  if (left.length !== right.length) throw new TypeError("Both comparison series must align with the dates.");
  return left.map((a, index) => {
    const b = right[index];
    const total = a + b;
    return observed(a) && observed(b) && total > 0 && Number.isFinite(total) ? 100 * ((a - b) / total) : null;
  });
}

export function observedRuns(values) {
  const runs = [];
  let current = [];
  values.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) { if (current.length) runs.push(current); current = []; }
    else current.push(index);
  });
  if (current.length) runs.push(current);
  return runs;
}
