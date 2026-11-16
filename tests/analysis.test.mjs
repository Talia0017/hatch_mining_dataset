import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  average,
  calculateScenario,
  comparisonFor,
  DAY,
  HOUR,
  daySelection,
  decodeHours,
  parseDateInput,
} from "../src/analysis.mjs";

const summary = JSON.parse(
  readFileSync(new URL("../public/data/summary.json", import.meta.url)),
);
const hours = decodeHours(
  JSON.parse(
    readFileSync(new URL("../public/data/hourly.json", import.meta.url)),
  ),
);

test("full source accounting and headline numbers reconcile with the hourly records", () => {
  assert.equal(hours.length, summary.observedHours);
  assert.equal(
    hours.reduce((n, h) => n + h.rows, 0),
    summary.audit.rawRows,
  );
  assert.ok(Math.abs(average(hours, "silica") - summary.averageSilica) < 1e-10);
  assert.equal(
    hours.filter((h) => h.silica > 2 + 1e-10).length,
    summary.elevatedHours,
  );
  assert.equal(summary.elevatedHours / hours.length, summary.elevatedShare);
  assert.equal(
    (summary.end - summary.start) / HOUR + 1 - hours.length,
    summary.audit.missingHours,
  );
  assert.equal(
    summary.source.sha256,
    "ae0231a0bd2e14aac39cf978d81db6c71907a42aade19327816692c4e30cb956",
  );
});

test("hour coordinates are unique and the longest run breaks at every gap or threshold crossing", () => {
  assert.equal(new Set(hours.map((h) => h.t)).size, hours.length);
  let longest = 0,
    current = 0,
    previous = null;
  for (const h of hours) {
    if (h.silica <= 2 + 1e-10) current = 0;
    else
      current = previous !== null && h.t - previous === HOUR ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = h.t;
  }
  assert.equal(longest, summary.longestRun.hours);
  assert.equal(longest, 88);
});

test("daily chart reconciles and explicitly represents missing calendar days", () => {
  assert.equal(
    summary.daily.reduce((n, d) => n + d.hours, 0),
    hours.length,
  );
  assert.equal(
    summary.daily.reduce((n, d) => n + d.above, 0),
    summary.elevatedHours,
  );
  for (const d of summary.daily) {
    const observed = hours.filter((h) => h.t >= d.t && h.t < d.t + DAY);
    assert.equal(observed.length, d.hours);
    if (d.hours)
      assert.ok(Math.abs(average(observed, "silica") - d.silica) < 1e-10);
    else assert.equal(d.silica, null);
  }
  assert.equal(
    summary.daily.find((d) => d.t === parseDateInput("2017-03-20")).silica,
    null,
  );
});

test("default comparison uses 88 selected hours and precisely 168 preceding hours, with no overlap", () => {
  const c = comparisonFor(hours, summary.longestRun);
  assert.equal(c.selected.length, 88);
  assert.equal(c.baseline.length, 168);
  assert.ok(c.baseline.every((h) => h.t < summary.longestRun.start));
  assert.equal(c.baseline[0].t, summary.longestRun.start - 7 * DAY);
  assert.equal(c.baseline.at(-1).t, summary.longestRun.start - HOUR);
  assert.equal(c.elevated, 88);
  assert.equal(c.varying, 51);
  assert.ok(Math.abs(average(c.selected, "air") - 265.9231576704546) < 1e-8);
  assert.ok(Math.abs(average(c.baseline, "air") - 241.834847718254) < 1e-8);
});

test("missing-day and dataset-start selections stay empty rather than being filled or extrapolated", () => {
  const gap = comparisonFor(hours, daySelection(parseDateInput("2017-03-20")));
  assert.equal(gap.selected.length, 0);
  assert.equal(average(gap.selected, "air"), null);
  const beginning = comparisonFor(hours, daySelection(summary.start));
  assert.equal(beginning.selected.length, 23);
  assert.equal(beginning.baseline.length, 0);
  assert.equal(beginning.expectedHours, 24);
});

test("default calculator arithmetic uses full-history exposure, without annualization", () => {
  assert.deepEqual(
    calculateScenario(summary.elevatedHours, 10, "500", "50000"),
    {
      reducedHours: 203.6,
      avoided: 101800,
      net: 51800,
    },
  );
  assert.deepEqual(calculateScenario(2036, 0, 500, 50000), {
    reducedHours: 0,
    avoided: 0,
    net: -50000,
  });
  assert.deepEqual(calculateScenario(2036, 100, 0, 0), {
    reducedHours: 2036,
    avoided: 0,
    net: 0,
  });
  assert.equal(calculateScenario(2036, 100, 1, 2036).net, 0);
});

test("calculator rejects blank, negative, nonfinite, excessive reduction and overflow inputs", () => {
  for (const bad of ["", null, -1, Infinity, "abc", NaN]) {
    assert.equal(calculateScenario(2036, 10, bad, 50000), null);
    assert.equal(calculateScenario(2036, 10, 500, bad), null);
  }
  assert.equal(calculateScenario(2036, 101, 500, 0), null);
  assert.equal(calculateScenario(2036, 100, Number.MAX_VALUE, 0), null);
});

test("source clock coordinates do not shift with the machine timezone", () => {
  assert.equal(parseDateInput("2017-04-21"), Date.UTC(2017, 3, 21));
  const d = daySelection(summary.longestRun.start);
  assert.equal(d.start, Date.UTC(2017, 3, 21));
  assert.equal(d.end - d.start, 23 * HOUR);
});
