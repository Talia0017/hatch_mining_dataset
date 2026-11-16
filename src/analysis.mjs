export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const THRESHOLD = 2;

export function decodeHours(payload) {
  return payload.rows.map((row) =>
    Object.fromEntries(payload.columns.map((key, i) => [key, row[i]])),
  );
}

export function average(rows, key) {
  const values = rows.map((row) => row[key]).filter(Number.isFinite);
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

export function comparisonFor(hours, selection) {
  const selected = hours.filter(
    (h) => h.t >= selection.start && h.t <= selection.end,
  );
  const baselineStart = selection.start - 7 * DAY;
  const baseline = hours.filter(
    (h) => h.t >= baselineStart && h.t < selection.start,
  );
  return {
    selected,
    baseline,
    baselineStart,
    baselineEnd: selection.start - HOUR,
    elevated: selected.filter((h) => h.silica > THRESHOLD + 1e-10).length,
    varying: selected.filter((h) => h.silicaUnique > 1).length,
    expectedHours: Math.floor((selection.end - selection.start) / HOUR) + 1,
  };
}

export function calculateScenario(
  elevatedHours,
  reduction,
  hourlyCost,
  implementationCost,
) {
  if (
    [reduction, hourlyCost, implementationCost].some(
      (v) => v === "" || v === null,
    )
  )
    return null;
  const values = [elevatedHours, reduction, hourlyCost, implementationCost].map(
    Number,
  );
  if (values.some((v) => !Number.isFinite(v) || v < 0) || values[1] > 100)
    return null;
  const reducedHours = (values[0] * values[1]) / 100;
  const avoided = reducedHours * values[2];
  const net = avoided - values[3];
  if (!Number.isFinite(avoided) || !Number.isFinite(net)) return null;
  return { reducedHours, avoided, net };
}

export function daySelection(t) {
  const start = Math.floor(Number(t) / DAY) * DAY;
  return { start, end: start + DAY - HOUR, kind: "day" };
}

// UTC is used ONLY as a stable plotting coordinate for timezone-unspecified labels.
export const dateFormat = (t, options = {}) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...options,
  }).format(new Date(t));

export const dateInput = (t) => new Date(t).toISOString().slice(0, 10);
export const parseDateInput = (s) => Date.parse(`${s}T00:00:00Z`);
export const periodLabel = (start, end) =>
  dateInput(start) === dateInput(end)
    ? dateFormat(start, { year: "numeric" })
    : `${dateFormat(start)} – ${dateFormat(end, { year: "numeric" })}`;
export const number = (v, digits = 0) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(v);
export const money = (v) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      }).format(v);
