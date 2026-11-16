import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  Clock3,
  Database,
  Download,
  FlaskConical,
  Info,
  MousePointer2,
  ScanLine,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import {
  DAY,
  HOUR,
  THRESHOLD,
  average,
  calculateScenario,
  comparisonFor,
  dateFormat,
  dateInput,
  daySelection,
  decodeHours,
  money,
  number,
  parseDateInput,
  periodLabel,
} from "./analysis.mjs";

const FACTORS = {
  air: {
    label: "Flotation Air Flow",
    short: "Column 01 air flow",
    unit: "Recorded flow units",
    digits: 1,
    explanation:
      "Ask whether air settings changed alongside the feed or operating strategy. Review Column 01 with the other six columns before proposing a trial.",
  },
  amina: {
    label: "Amina Flow",
    short: "Amina flow",
    unit: "Recorded flow units",
    digits: 1,
    explanation:
      "Review reagent demand and operator responses with process engineers. A dosage difference may reflect a response to difficult feed rather than the source of a quality issue.",
  },
  starch: {
    label: "Starch Flow",
    short: "Starch flow",
    unit: "Recorded flow units",
    digits: 1,
    explanation:
      "Check reagent records, feed characteristics and operating changes together. This comparison alone does not identify an appropriate starch setting.",
  },
  ph: {
    label: "Ore Pulp pH",
    short: "Ore pulp pH",
    unit: "pH",
    digits: 3,
    explanation:
      "Check whether pulp chemistry or deliberate adjustments differed during the period. pH uses a logarithmic scale, so the comparison reports a pH-unit difference, not a percentage.",
  },
};

function SectionHeading({ step, name, title, children }) {
  return (
    <div className="section-heading">
      <div className="eyebrow">
        <span className="step">{step}</span>
        {name}
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (d?.silica == null) return null;
  return (
    <div className="chart-tooltip">
      <span>{dateFormat(d.t, { year: "numeric" })}</span>
      <strong>
        {number(d.silica, 2)}
        <small>% silica</small>
      </strong>
      <p>
        {d.above} of {d.hours} observed hours above 2%
      </p>
      <em>Click to investigate this day</em>
    </div>
  );
}

function Trend({ summary, selection, onSelect }) {
  const [window, setWindow] = useState("all");
  const [day, setDay] = useState(dateInput(selection.start));
  const months = [
    ...new Set(summary.daily.map((d) => dateInput(d.t).slice(0, 7))),
  ];
  const visible = useMemo(
    () =>
      summary.daily
        .filter((d) => window === "all" || dateInput(d.t).startsWith(window))
        .map((d) => ({
          ...d,
          elevated: d.silica > THRESHOLD ? d.silica : null,
        })),
    [summary, window],
  );
  const low = visible[0].t;
  const high = visible.at(-1).t;
  const gap = summary.audit.gaps[0];
  const selectedStart = Math.max(Math.floor(selection.start / DAY) * DAY, low);
  const selectedEnd = Math.min(
    Math.floor(selection.end / DAY) * DAY + DAY * 0.55,
    high,
  );
  const ticks = visible
    .filter((_, i) => i % Math.max(1, Math.floor(visible.length / 6)) === 0)
    .map((d) => d.t);

  useEffect(() => {
    setDay(dateInput(selection.start));
  }, [selection]);
  function pickDate(value) {
    setDay(value);
    const t = parseDateInput(value);
    if (
      Number.isFinite(t) &&
      t >= Math.floor(summary.start / DAY) * DAY &&
      t <= summary.end
    )
      onSelect(daySelection(t));
  }

  return (
    <div className="chart-card">
      <div className="chart-heading">
        <div>
          <h3>Quality over time</h3>
          <p>Daily average silica concentration</p>
        </div>
        <label className="select-wrap">
          <span className="sr-only">Chart window</span>
          <select
            aria-label="Chart window"
            value={window}
            onChange={(e) => setWindow(e.target.value)}
          >
            <option value="all">Full history</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {dateFormat(parseDateInput(`${m}-01`), {
                  month: "long",
                  year: "numeric",
                  day: undefined,
                })}
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-line" />
          Daily average
        </span>
        <span>
          <i className="legend-dot orange" />
          Above illustrative 2%
        </span>
        <span className="chart-hint">
          <MousePointer2 size={13} />
          Select a day on the chart
        </span>
      </div>
      <div
        className="trend-chart"
        role="group"
        aria-label="Interactive daily silica trend. Use the date picker below as a keyboard alternative."
      >
        <div className="axis-unit">SILICA (%)</div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visible}
            margin={{ top: 25, right: 24, left: -18, bottom: 0 }}
            onClick={(state) => {
              const raw = state?.activeLabel;
              if (raw === undefined || raw === null) return;
              const t = Number(raw);
              if (visible.some((d) => d.t === t && d.hours > 0))
                onSelect(daySelection(t));
            }}
          >
            <defs>
              <linearGradient id="silica-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#15877b" stopOpacity="0.13" />
                <stop offset="100%" stopColor="#15877b" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#e9eeed"
              vertical={false}
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="t"
              type="number"
              domain={[low, high]}
              ticks={ticks}
              tickFormatter={(t) => dateFormat(t)}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#7a858c" }}
              minTickGap={24}
              dy={10}
            />
            <YAxis
              domain={[0, 6]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#7a858c" }}
            />
            {gap && gap.start < high && gap.end > low && (
              <ReferenceArea
                x1={Math.max(gap.start, low)}
                x2={Math.min(gap.end, high)}
                fill="#c6ced1"
                fillOpacity={0.15}
                label={{
                  value: "No records",
                  fill: "#859198",
                  fontSize: 10,
                  position: "insideTop",
                }}
              />
            )}
            {selectedStart <= selectedEnd && (
              <ReferenceArea
                x1={selectedStart}
                x2={selectedEnd}
                fill="#087f73"
                fillOpacity={0.1}
                stroke="#087f73"
                strokeOpacity={0.2}
              />
            )}
            <Area
              type="linear"
              dataKey="silica"
              stroke="none"
              fill="url(#silica-fill)"
              connectNulls={false}
              isAnimationActive={false}
              tooltipType="none"
            />
            <ReferenceLine
              y={THRESHOLD}
              stroke="#cf7c48"
              strokeDasharray="5 5"
              label={{
                value: "2% illustrative threshold",
                position: "insideTopRight",
                fill: "#ac653c",
                fontSize: 10,
              }}
            />
            <Line
              type="linear"
              dataKey="silica"
              stroke="#167f75"
              strokeWidth={1.8}
              dot={false}
              activeDot={{
                r: 5,
                stroke: "white",
                strokeWidth: 2,
                fill: "#0d746a",
              }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="elevated"
              stroke="#d37a48"
              strokeWidth={2}
              dot={{ r: 1.6, strokeWidth: 0, fill: "#d37a48" }}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
              tooltipType="none"
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#768c87", strokeDasharray: "4 4" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-caption">
        <Info size={14} />
        <p>
          2% is an illustrative threshold,{" "}
          <strong>not a confirmed plant quality specification</strong>. Daily
          averages can conceal individual elevated hours; KPIs use hourly
          values.
        </p>
      </div>
      <div className="selection-strip">
        <div>
          <span className="selection-dot" />
          <span>
            Selected period{" "}
            <strong>{periodLabel(selection.start, selection.end)}</strong>
          </span>
        </div>
        <div className="selection-actions">
          <label className="date-short">
            <span className="sr-only">Select a day to investigate</span>
            <input
              aria-label="Select a day to investigate"
              type="date"
              value={day}
              min={dateInput(summary.start)}
              max={dateInput(summary.end)}
              onChange={(e) => pickDate(e.target.value)}
            />
          </label>
          <a href="#investigate">
            Investigate <ArrowDown size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

function Investigation({ summary, hours, selection, setSelection }) {
  const [factor, setFactor] = useState("air");
  const [start, setStart] = useState(dateInput(selection.start));
  const [end, setEnd] = useState(dateInput(selection.end));
  const [rangeError, setRangeError] = useState("");
  const c = useMemo(() => comparisonFor(hours, selection), [hours, selection]);
  const info = FACTORS[factor];
  const selectedMean = average(c.selected, factor);
  const baselineMean = average(c.baseline, factor);
  const valid = selectedMean !== null && baselineMean !== null;
  const delta = valid ? selectedMean - baselineMean : null;
  const percent =
    valid && baselineMean !== 0 ? (delta / baselineMean) * 100 : null;
  const maximum = Math.max(selectedMean ?? 0, baselineMean ?? 0, 1) * 1.13;
  const change = !valid
    ? null
    : factor === "ph"
      ? `${delta >= 0 ? "+" : "−"}${number(Math.abs(delta), 3)} pH units`
      : percent === null
        ? null
        : `${percent >= 0 ? "+" : "−"}${number(Math.abs(percent), 1)}%`;
  const selectedSilica = average(c.selected, "silica");
  const baselineSilica = average(c.baseline, "silica");
  useEffect(() => {
    setStart(dateInput(selection.start));
    setEnd(dateInput(selection.end));
    setRangeError("");
  }, [selection]);

  function applyRange(e) {
    e.preventDefault();
    const s = parseDateInput(start),
      en = parseDateInput(end);
    if (
      !Number.isFinite(s) ||
      !Number.isFinite(en) ||
      s > en ||
      s < Math.floor(summary.start / DAY) * DAY ||
      en > summary.end
    ) {
      setRangeError(
        "Choose an ordered date range within the recorded history.",
      );
      return;
    }
    setSelection({ start: s, end: en + DAY - HOUR, kind: "custom" });
  }

  return (
    <section id="investigate" className="story-section">
      <SectionHeading
        step="02"
        name="Investigate"
        title="What operating conditions might be related?"
      >
        Start with a comparison. Then ask what the data cannot tell us.
      </SectionHeading>
      <div className="investigate-card">
        <div className="period-toolbar">
          <div>
            <ScanLine size={17} />
            <strong>{periodLabel(selection.start, selection.end)}</strong>
            <span className="subtle-tag">
              {selection.kind === "longest"
                ? "Longest elevated sequence"
                : "Selected period"}
            </span>
          </div>
          <button
            className="text-button"
            onClick={() =>
              setSelection({ ...summary.longestRun, kind: "longest" })
            }
          >
            Use longest sequence <ArrowUpRight size={14} />
          </button>
        </div>
        <details className="range-details">
          <summary>
            Choose a different date range <ChevronDown size={13} />
          </summary>
          <form className="range-form" onSubmit={applyRange}>
            <label>
              From
              <input
                aria-label="Period start date"
                type="date"
                value={start}
                min={dateInput(summary.start)}
                max={dateInput(summary.end)}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </label>
            <label>
              To
              <input
                aria-label="Period end date"
                type="date"
                value={end}
                min={start}
                max={dateInput(summary.end)}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </label>
            <button className="button secondary" type="submit">
              Apply period <ArrowRight size={14} />
            </button>
          </form>
          {rangeError && (
            <p role="alert" className="error-text">
              {rangeError}
            </p>
          )}
        </details>
        <div className="comparison-context" aria-live="polite">
          <div>
            <span>SELECTED PERIOD</span>
            <p>
              <strong>
                {number(selectedSilica, 2)}
                <small>% silica</small>
              </strong>
              <em>
                {number(c.selected.length)} observed hours ·{" "}
                {number(c.elevated)} above 2%
              </em>
            </p>
          </div>
          <div>
            <span>PRECEDING 7 DAYS</span>
            <p>
              <strong>
                {number(baselineSilica, 2)}
                <small>% silica</small>
              </strong>
              <em>
                {number(c.baseline.length)} of 168 possible hours recorded
              </em>
            </p>
          </div>
        </div>
        <div
          className="factor-tabs"
          role="group"
          aria-label="Operating condition"
        >
          {Object.entries(FACTORS).map(([key, value]) => (
            <button
              key={key}
              aria-pressed={key === factor}
              onClick={() => setFactor(key)}
            >
              {value.label}
            </button>
          ))}
        </div>
        <div className="investigation-body">
          <div className="comparison-chart">
            <div className="comparison-title">
              <div>
                <h3>{info.short}</h3>
                <p>Average of hourly means · {info.unit.toLowerCase()}</p>
              </div>
              {change && <span className="change-tag">{change}</span>}
            </div>
            {!c.selected.length ? (
              <div className="empty-state">
                <Database size={26} />
                <h4>No recorded hours in this period</h4>
                <p>
                  Missing data are not treated as zero. Select a period with
                  observations.
                </p>
              </div>
            ) : !c.baseline.length ? (
              <div className="empty-state">
                <Clock3 size={26} />
                <h4>No preceding-week baseline available</h4>
                <p>
                  Selected average: {number(selectedMean, info.digits)}. Choose
                  a later period to make a comparison.
                </p>
              </div>
            ) : (
              <div
                className="bars"
                role="img"
                aria-label={`${info.short}: selected ${number(selectedMean, info.digits)}; preceding week ${number(baselineMean, info.digits)}. ${info.unit}. Zero-based scale.`}
              >
                <div className="bar-row">
                  <div className="bar-label">
                    Preceding 7 days
                    <span>{number(baselineMean, info.digits)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar baseline"
                      style={{ width: `${(baselineMean / maximum) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="bar-row">
                  <div className="bar-label">
                    Selected period
                    <span>{number(selectedMean, info.digits)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar selected"
                      style={{ width: `${(selectedMean / maximum) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="bar-axis">
                  <span>0</span>
                  <span>{number(maximum / 2, factor === "ph" ? 1 : 0)}</span>
                  <span>{number(maximum, factor === "ph" ? 1 : 0)}</span>
                </div>
              </div>
            )}
            <p className="baseline-note">
              Selected:{" "}
              {dateFormat(selection.start, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              –{" "}
              {dateFormat(selection.end, {
                hour: "2-digit",
                minute: "2-digit",
              })}
              .<br />
              Baseline:{" "}
              {dateFormat(c.baselineStart, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              –{" "}
              {dateFormat(c.baselineEnd, {
                hour: "2-digit",
                minute: "2-digit",
              })}
              .<br />
              Original clock labels; timezone unspecified. The preceding week
              provides recent context, not a matched control.
            </p>
          </div>
          <div className="interpretation" aria-live="polite">
            <div>
              <span className="interpret-label">
                <i />
                Observation
              </span>
              <p>
                {!valid ? (
                  "The selected period and baseline need recorded hours before a difference can be interpreted."
                ) : (
                  <>
                    {info.short} averaged{" "}
                    <strong>{number(selectedMean, info.digits)}</strong> versus{" "}
                    <strong>{number(baselineMean, info.digits)}</strong> in the
                    preceding week{change ? ` (${change})` : ""}.{" "}
                    {factor === "ph" && Math.abs(delta) < 0.05
                      ? "The averages are close; this is a weak lead on its own."
                      : "This is a descriptive difference in this period."}
                  </>
                )}
              </p>
            </div>
            <div>
              <span className="interpret-label possible">
                <i />
                Possible explanation
              </span>
              <p>{info.explanation}</p>
            </div>
            <div>
              <span className="interpret-label limitation">
                <i />
                Limitation
              </span>
              <p>
                Feed changes, timing and operator responses may affect both
                variables. Held or interpolated quality labels limit what this
                comparison proves. It does not establish causation.
              </p>
            </div>
          </div>
        </div>
        <div className="investigation-footer">
          <Info size={14} />
          <span>
            {c.varying > 0
              ? `${c.varying} selected hourly groups contain varying silica labels. `
              : ""}
            {c.expectedHours - c.selected.length > 0
              ? `${c.expectedHours - c.selected.length} selected hours have no records. `
              : ""}
            Flow units are unverified; air flow refers to Column 01. No setting
            change is recommended from this comparison alone.
          </span>
        </div>
      </div>
    </section>
  );
}

function Calculator({ summary }) {
  const [reduction, setReduction] = useState(10);
  const [cost, setCost] = useState("500");
  const [implementation, setImplementation] = useState("50000");
  const result = calculateScenario(
    summary.elevatedHours,
    reduction,
    cost,
    implementation,
  );
  const costInvalid =
    cost === "" || !Number.isFinite(Number(cost)) || Number(cost) < 0;
  const implementationInvalid =
    implementation === "" ||
    !Number.isFinite(Number(implementation)) ||
    Number(implementation) < 0;
  return (
    <div className="calculator">
      <div className="calculator-intro">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal size={15} />
            Explore the business case
          </span>
          <h3>What could an improvement be worth?</h3>
          <p>Test the assumptions. See how the opportunity changes.</p>
        </div>
        <span className="scenario-badge">Hypothetical scenario</span>
      </div>
      <div className="calculator-body">
        <div className="calculator-inputs">
          <div className="range-label">
            <label htmlFor="reduction">
              Assumed reduction in elevated hours
            </label>
            <output htmlFor="reduction">{reduction}%</output>
          </div>
          <input
            id="reduction"
            type="range"
            min="0"
            max="100"
            step="1"
            value={reduction}
            onChange={(e) => setReduction(Number(e.target.value))}
            style={{ "--range-fill": `${reduction}%` }}
          />
          <div className="range-limits">
            <span>0% · no improvement</span>
            <span>100%</span>
          </div>
          <div className="money-inputs">
            <label htmlFor="hour-cost">
              Assumed avoidable cost per affected hour
              <div className={`currency-input ${costInvalid ? "invalid" : ""}`}>
                <span>$</span>
                <input
                  id="hour-cost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={cost}
                  aria-invalid={costInvalid}
                  aria-describedby={costInvalid ? "cost-error" : undefined}
                  onChange={(e) => setCost(e.target.value)}
                />
                <span>CAD</span>
              </div>
              {costInvalid && (
                <small id="cost-error" className="error-text">
                  Enter a non-negative amount.
                </small>
              )}
            </label>
            <label htmlFor="implementation">
              Estimated implementation cost
              <div
                className={`currency-input ${implementationInvalid ? "invalid" : ""}`}
              >
                <span>$</span>
                <input
                  id="implementation"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={implementation}
                  aria-invalid={implementationInvalid}
                  aria-describedby={
                    implementationInvalid ? "implementation-error" : undefined
                  }
                  onChange={(e) => setImplementation(e.target.value)}
                />
                <span>CAD</span>
              </div>
              {implementationInvalid && (
                <small id="implementation-error" className="error-text">
                  Enter a non-negative amount.
                </small>
              )}
            </label>
          </div>
          <p className="calculator-assumption">
            <Info size={14} />
            <span>
              Uses{" "}
              <strong>
                {number(summary.elevatedHours)} recorded hours above 2%
              </strong>{" "}
              across the full dataset. Values are for this historical window,
              not an annual forecast. CAD is an illustrative currency.
            </span>
          </p>
        </div>
        <div
          className="calculator-result"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="avoided">
            <span>Potential avoided cost</span>
            <strong>{money(result?.avoided ?? null)}</strong>
          </div>
          <div className="net-benefit">
            <span>Potential net benefit</span>
            <strong className={result?.net < 0 ? "negative" : ""}>
              {money(result?.net ?? null)}
              <ArrowUpRight size={25} />
            </strong>
            <p>
              {!result
                ? "Enter valid assumptions to calculate."
                : result.net > 0
                  ? "After the assumed implementation cost"
                  : result.net === 0
                    ? "Break-even under these assumptions"
                    : "Implementation cost exceeds potential avoided cost"}
            </p>
          </div>
          <div className="hours-reduced">
            <span>{number(result?.reducedHours ?? null, 1)} hours</span>{" "}
            hypothetically avoided
          </div>
        </div>
      </div>
      <details className="formula-details">
        <summary>
          How this scenario is calculated <ChevronDown size={14} />
        </summary>
        <div>
          <p>
            <strong>Potential avoided cost</strong> = elevated-silica hours ×
            assumed reduction rate × assumed avoidable cost per hour.
          </p>
          <p>
            <strong>Potential net benefit</strong> = potential avoided cost −
            implementation cost.
          </p>
          {result && (
            <code>
              {number(summary.elevatedHours)} × {reduction}% ×{" "}
              {money(Number(cost))} − {money(Number(implementation))} ={" "}
              {money(result.net)}
            </code>
          )}
          <p>
            Elevated labels are a proxy for this exercise, not verified
            defective production or independently measured affected operating
            hours. Attainable improvement, throughput, actual disposition and
            avoidable cost need plant validation. Recurring costs, ramp-up and
            other production trade-offs are not modeled.
          </p>
        </div>
      </details>
    </div>
  );
}

function Recommendations({ summary }) {
  const cards = [
    {
      icon: ScanLine,
      number: "01",
      title: "Investigate the sustained periods",
      why: `The longest sequence contains ${summary.longestRun.hours} consecutive hourly labels above 2%. It gives the investigation a specific starting point.`,
      next: "Review these dates with plant teams. Reconcile sample IDs, lab release times and operating logs.",
      value: "Focus investigation on a traceable quality concern.",
    },
    {
      icon: FlaskConical,
      number: "02",
      title: "Validate the operating context",
      why: "The comparison reveals conditions worth checking, but differences alone cannot identify a cause.",
      next: "Review feed and reagent records with process engineers. Define a controlled trial only after validating timing.",
      value: "Build evidence before changing operating settings.",
    },
    {
      icon: Activity,
      number: "03",
      title: "Evaluate an early-warning pilot",
      why: "A monitoring pilot could help teams notice sustained deviations and respond consistently.",
      next: "Agree on a plant-specific threshold and response protocol. Measure alert quality, response time and actual costs.",
      value: "Test whether better visibility supports better decisions.",
    },
  ];
  return (
    <section id="recommend" className="story-section">
      <SectionHeading
        step="03"
        name="Recommend"
        title="Turning operational insights into business decisions"
      >
        Prioritize validation, then test whether an improvement creates value.
      </SectionHeading>
      <div className="recommendation-grid">
        {cards.map((card) => (
          <article className="recommendation" key={card.number}>
            <div className="recommendation-top">
              <card.icon size={22} strokeWidth={1.6} />
              <span>{card.number}</span>
            </div>
            <h3>{card.title}</h3>
            <p>{card.why}</p>
            <div className="next-step">
              <span>Suggested next step</span>
              <p>{card.next}</p>
            </div>
            <div className="business-value">
              <TrendingUp size={15} />
              <span>{card.value}</span>
            </div>
          </article>
        ))}
      </div>
      <Calculator summary={summary} />
      <div className="conclusion">
        <span className="eyebrow">The advisory takeaway</span>
        <h3>
          Better questions.
          <br />
          <em>Better-informed decisions.</em>
        </h3>
        <div>
          <p>
            Operational data can help identify quality risks, guide further
            investigation, and prioritize opportunities for process improvement.
          </p>
          <p>
            Actual financial benefits require additional plant-specific
            validation.
          </p>
        </div>
      </div>
    </section>
  );
}

function DataNotes({ summary }) {
  const a = summary.audit;
  return (
    <section id="data-notes" className="data-notes">
      <details>
        <summary>
          <span>
            <Database size={17} />
            About the data & methodology
          </span>
          <span>
            Read the analysis notes <ChevronDown size={16} />
          </span>
        </summary>
        <div className="notes-body">
          <div>
            <h3>Original data, carefully grouped</h3>
            <p>
              <code>{summary.source.filename}</code> contains{" "}
              {number(a.rawRows)} records and {a.columns} columns. Decimal
              commas are parsed as numbers. Timestamps are grouped into{" "}
              {number(summary.observedHours)} observed hours, with{" "}
              {a.rowsPerHour.min}–{a.rowsPerHour.max} rows per hour.
            </p>
            <p>
              Each hourly value is an arithmetic mean. The overall silica
              average and daily trend give each recorded hour equal weight. This
              is not a tonnage-weighted or true time-weighted measure. No rows
              are removed for sharing a timestamp.
            </p>
            <p>
              The {number(a.exactDuplicateRows)} exact duplicate rows are
              retained. Removing them leaves the two headline silica metrics
              unchanged in this file.
            </p>
          </div>
          <div>
            <h3>What this export cannot establish</h3>
            <p>
              {a.missingHours} hours are missing. Missing hours stay missing and
              break elevated sequences. Timestamps retain their original clock
              labels; the timezone is unspecified.
            </p>
            <p>
              {a.varyingSilicaHours} hourly groups contain varying silica
              values, all with a linear interpolation-like pattern. The same
              hourly silica value persists for up to {summary.longestHold.hours}{" "}
              consecutive labels. Neither pattern establishes independent lab
              samples or the timing of actual process conditions.
            </p>
            <p>
              As a sensitivity check, using only the{" "}
              {number(summary.constantOnly.hours)} constant-label hours gives{" "}
              {number(
                (summary.constantOnly.elevatedHours /
                  summary.constantOnly.hours) *
                  100,
                1,
              )}
              % above 2%, versus {number(summary.elevatedShare * 100, 1)}% for
              all hours. Both are descriptive views.
            </p>
          </div>
          <div>
            <h3>Definitions and boundaries</h3>
            <p>
              “Elevated” means an hourly mean strictly greater than the
              illustrative 2% silica threshold. A run ends at a missing or
              non-elevated hour. The longest sequence is a count of recorded
              hourly labels, not a verified continuous plant event.
            </p>
            <p>
              Operating comparisons use the preceding seven calendar days and
              exclude the selected period. They are descriptive, with no
              significance tests or causal claims. Recorded flow units, sample
              collection time, process delay and laboratory release time are
              unverified.
            </p>
            <p>
              The financial calculator uses full-history elevated hours as an
              illustrative proxy, not a measured defect cost or annual savings
              forecast. The older notebook's 3% threshold and median aggregation
              are a separate analysis.
            </p>
          </div>
          <div className="notes-downloads">
            <a href="/data/hourly.csv" download>
              <Download size={15} />
              Download hourly data
            </a>
            <a href="/data/summary.json" download>
              <Download size={15} />
              Download metrics & audit
            </a>
            <span>
              Source SHA-256 <code>{summary.source.sha256}</code>
            </span>
          </div>
        </div>
      </details>
    </section>
  );
}

function CaseStudy({ summary, hours }) {
  const [selection, setSelection] = useState({
    ...summary.longestRun,
    kind: "longest",
  });
  const [activeSection, setActiveSection] = useState("discover");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    document
      .querySelectorAll(".story-section")
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className="skip-link" href="#discover">
        Skip to the analysis
      </a>
      <header className="site-header">
        <div className="nav-inner">
          <a
            className="brand"
            href="#top"
            aria-label="Steven's case study, back to top"
          >
            <span className="brand-mark">
              <BarChart3 size={21} />
            </span>
            <span>
              STEVEN<span className="brand-divider">/</span>
              <span className="brand-sub">CASE STUDIES</span>
            </span>
          </a>
          <nav aria-label="Case study sections">
            {["discover", "investigate", "recommend"].map((id, i) => (
              <a
                key={id}
                href={`#${id}`}
                className={activeSection === id ? "active" : ""}
                aria-current={activeSection === id ? "location" : undefined}
              >
                <span>0{i + 1}</span>
                {id[0].toUpperCase() + id.slice(1)}
              </a>
            ))}
          </nav>
          <a
            className="header-note"
            href="#data-notes"
            onClick={() => {
              const details = document.querySelector("#data-notes details");
              if (details) details.open = true;
            }}
          >
            About the data <ArrowUpRight size={15} />
          </a>
        </div>
      </header>
      <main id="top" className="page-shell">
        <section className="hero">
          <div className="hero-meta">
            <span className="eyebrow">
              <span className="tiny-square" />
              Data science meets industrial advisory
            </span>
            <span className="reading-time">
              <Clock3 size={13} />A 5-minute case study
            </span>
          </div>
          <div className="hero-main">
            <div>
              <h1>
                Iron ore processing.
                <br />
                <span>
                  From data to
                  <br className="desktop-break" /> business decisions.
                </span>
              </h1>
            </div>
            <div className="hero-aside">
              <p>
                How can operational data help a plant identify quality concerns
                and evaluate opportunities to reduce costs?
              </p>
              <div className="presenter">
                <span className="avatar">S</span>
                <div>
                  <strong>Presented by Steven</strong>
                  <span>Third-year Data Science student</span>
                </div>
              </div>
              <a className="hero-link" href="#discover">
                Follow the analysis <ArrowDown size={15} />
              </a>
            </div>
          </div>
          <div className="dataset-strip">
            <span className="dataset-label">
              <Database size={15} />
              THE DATASET
            </span>
            <span>
              {number(summary.audit.rawRows)} <em>records</em>
            </span>
            <span>
              {number(summary.observedHours)} <em>observed hours</em>
            </span>
            <span>{periodLabel(summary.start, summary.end)}</span>
            <span className="historical-badge">
              <span />
              Historical analysis
            </span>
          </div>
        </section>
        <section id="discover" className="story-section discover-section">
          <SectionHeading
            step="01"
            name="Discover"
            title="Where is product quality at risk?"
          >
            First, identify when recorded silica is elevated—and how long the
            pattern lasts.
          </SectionHeading>
          <div className="kpi-grid">
            <article className="kpi">
              <div className="kpi-label">
                Average silica concentration
                <FlaskConical size={17} />
              </div>
              <div className="kpi-value">
                {number(summary.averageSilica, 2)}
                <span>%</span>
              </div>
              <p>
                Across {number(summary.observedHours)} equally weighted hours
              </p>
            </article>
            <article className="kpi concern">
              <div className="kpi-label">
                Observed hours above 2%
                <Activity size={17} />
              </div>
              <div className="kpi-value">
                {number(summary.elevatedShare * 100, 1)}
                <span>%</span>
              </div>
              <p>
                {number(summary.elevatedHours)} of{" "}
                {number(summary.observedHours)} recorded hours
              </p>
            </article>
            <article className="kpi">
              <div className="kpi-label">
                Longest elevated sequence
                <Clock3 size={17} />
              </div>
              <div className="kpi-value">
                {summary.longestRun.hours}
                <span>hours</span>
              </div>
              <p>
                {periodLabel(summary.longestRun.start, summary.longestRun.end)}{" "}
                · consecutive hourly labels
              </p>
            </article>
          </div>
          <Trend
            summary={summary}
            selection={selection}
            onSelect={setSelection}
          />
          <div className="insight-card">
            <span className="insight-icon">
              <ScanLine size={20} />
            </span>
            <div>
              <span className="eyebrow">What I found</span>
              <p>
                <strong>
                  Elevated silica is not limited to isolated hours.
                </strong>{" "}
                {number(summary.elevatedShare * 100, 1)}% of recorded hourly
                means exceed 2%, including an {summary.longestRun.hours}-hour
                sequence in{" "}
                {dateFormat(summary.longestRun.start, {
                  month: "long",
                  day: undefined,
                })}
                . This gives us a concrete period to investigate—not proof of
                rejected product.
              </p>
            </div>
            <a href="#investigate" aria-label="Continue to investigate">
              <ArrowDown size={19} />
            </a>
          </div>
        </section>
        <Investigation
          summary={summary}
          hours={hours}
          selection={selection}
          setSelection={setSelection}
        />
        <Recommendations summary={summary} />
        <DataNotes summary={summary} />
        <footer>
          <div className="footer-brand">
            <BarChart3 size={16} />
            <strong>Steven</strong>
            <span>Data → Insight → Decision</span>
          </div>
          <p>
            Independent educational case study · Not affiliated with Hatch or
            the plant
          </p>
          <a href="#top">Back to top ↑</a>
        </footer>
      </main>
    </>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      ["/data/summary.json", "/data/hourly.json"].map(async (url) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok)
          throw new Error(`Data request failed (${response.status})`);
        return response.json();
      }),
    )
      .then(([summary, hourly]) => {
        if (!summary.longestRun || !hourly.columns || !hourly.rows?.length)
          throw new Error("Processed data are incomplete.");
        setData({ summary, hours: decodeHours(hourly) });
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, []);
  if (error)
    return (
      <main className="load-state">
        <Database size={32} />
        <h1>The case study data could not load.</h1>
        <p>
          {error}. Ensure the processed files are available, then try again.
        </p>
        <button className="button" onClick={() => location.reload()}>
          Retry
        </button>
      </main>
    );
  if (!data)
    return (
      <main className="load-state" aria-busy="true">
        <BarChart3 size={32} />
        <h1>Opening the case study</h1>
        <p>Loading the historical analysis…</p>
      </main>
    );
  return <CaseStudy {...data} />;
}
