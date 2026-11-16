# Website findings and analytical boundaries

These results were recomputed directly from `MiningProcess_Flotation_Plant_Database.csv`, not copied from the older notebook. The file's SHA-256 matches the existing analysis project's audit. Source times have no documented timezone.

## Discover: recorded silica is elevated for sustained sequences

| Metric | Actual result | Definition |
| --- | ---: | --- |
| Original records | 737,453 | Complete source file, 24 columns |
| Observed hourly groups | 4,097 | One equally weighted record per supplied hour label |
| Average silica | 2.326753722% | Arithmetic mean of the hourly silica means |
| Hourly means strictly above 2% | 2,036 / 4,097 (49.694898706%) | Illustrative threshold, not a plant specification |
| Longest elevated sequence | 88 consecutive hourly labels | 21 April 2017 03:00–24 April 2017 18:00, inclusive |
| Average silica in that sequence | 3.958238636% | Mean of 88 hourly means |
| Missing hourly labels | 318 | 16 March 2017 06:00–29 March 2017 11:00 |

The 88 labels span 87 hours between their first and last timestamps. “88 hours” on the site means **88 consecutive recorded hourly groups**. The export does not establish when individual samples were collected, released, or applicable to physical plant conditions. No run crosses a gap or an hour at or below 2%.

The daily line averages available hourly means, giving each observed hour equal weight. A missing day is left blank; a partially observed day uses only its recorded hours. Daily averages can hide hourly exceedances, so tooltips also show each day's elevated-hour numerator and observed-hour denominator. All three KPIs retain the full-history population when a chart window or investigation period changes.

## Investigate: comparison with the preceding seven days

Default selected period: **21 April 03:00–24 April 18:00**, 88 observed hours.

Baseline: **14 April 03:00–21 April 02:00**, 168 observed hours. This window is exactly seven calendar days before the selected period and has no overlap. It provides recent historical context, not a matched control or a low-silica reference group.

| Variable | Selected mean | Baseline mean | Difference |
| --- | ---: | ---: | ---: |
| Silica concentration (%) | 3.95824 | 2.71875 | +1.23949 percentage points |
| Flotation Column 01 Air Flow | 265.92316 | 241.83485 | +9.96% |
| Amina Flow | 516.68813 | 483.51134 | +6.86% |
| Starch Flow | 1,876.50995 | 1,931.88743 | −2.87% |
| Ore Pulp pH | 9.60834 | 9.59445 | +0.01389 pH units |

Flow values retain the dataset's recorded scale; physical flow units are unverified. Air flow represents Column 01, not the sum or average of all seven columns. Because pH is logarithmic, the site reports its absolute difference instead of a percentage change.

**Supported observation:** these recorded conditions differ between these two historical windows. The pH averages are close and provide little evidence on their own. Fifty-one of the 88 selected hourly groups contain varying silica labels with interpolation-like behavior, which materially limits interpretation of this particular sequence.

**Possible explanation to investigate:** changing feed, operating strategy, reagent demand or operator response may accompany the differences. Engineers should check these possibilities against original process and laboratory records.

**Unsupported conclusion:** increasing/decreasing a reagent, air flow or pH would necessarily improve quality. This comparison cannot separate an operating cause from a response to quality, timing misalignment or another changing condition. No correlations, p-values, predictive model or causal treatment effects are presented.

## Data audit and sensitivity

- The source has no empty or nonfinite numeric cells. Its timestamp coverage is nevertheless incomplete.
- Every timestamp is on the hour; hourly groups contain 174–180 rows, typically 180. Their true subhour timing is unknown. Rows are not treated as independent quality samples.
- All numeric fields are parsed with decimal commas. Exactly repeated rows are counted (1,171) and retained. Removing those exact duplicates leaves the average silica and the 2,036 elevated-hour count unchanged in this file.
- Silica varies inside 310 hourly groups; iron concentrate varies inside 216. Every varying group agrees with a straight line between its first and last recorded values to within 1e-8. That is an interpolation-like signature, not proof of how the export was created.
- The mean silica value is held at 2.08% for 73 consecutive hourly labels from 31 July 20:00 to 3 August 20:00. Constant values do not prove repeated independent measurements.
- A sensitivity view using only 3,787 constant-within-hour silica groups gives **1,732 / 3,787 = 45.7354%** above 2%, compared with **49.6949%** over all hourly means. Exclusion changes the observed population and is not guaranteed to remove bias.
- Hourly arithmetic means are descriptive; missing subhour times and throughput prevent true duration-weighted or production-weighted summaries. No affected tonnage, recovery, rejection rate, downtime or verified plant cost can be inferred.
- The script fails on unexpected schema, missing/nonfinite cells, non-hour labels or unordered hour groups. It does not silently repair a different input version. Reinspect a new file before changing that policy.

## Recommend: validate the evidence before operational action

1. Investigate the sustained periods using sample IDs, lab release times and operating logs. This makes the concern traceable.
2. Review feed and operating context with process engineers; use a controlled trial only once timing and candidate explanations are validated.
3. Evaluate a quality-monitoring pilot using a genuine plant threshold and an agreed response protocol. Assess alert quality, response time and actual avoidable cost.

The hypothetical calculator uses the complete historical window, **not an annual forecast**:

```text
Potential avoided cost = 2,036 × assumed reduction rate × assumed avoidable cost per hour
Potential net benefit  = potential avoided cost − implementation cost
```

The initial teaching assumptions are 10% improvement, CAD $500 avoidable cost per affected hour and CAD $50,000 implementation cost. These yield 203.6 hypothetical avoided hours, CAD $101,800 potential avoided cost and CAD $51,800 potential net benefit. **None of these financial assumptions is measured by the CSV.** CAD itself is an illustrative choice.

The scenario treats elevated labels as a proxy for potentially affected hours. Actual cost, feasibility, throughput, product disposition, sample timing and independence require validation. It excludes recurring costs, ramp-up, discounting and effects on recovery or other production outcomes. Negative outcomes and zero improvement remain visible rather than being clamped to a favorable result.

## A five-minute presentation route

**Minute 1 — Frame the question.** “I wanted to understand how historical operational data could guide quality investigation and a business decision. This is a historical case study; 2% is an illustrative review line.”

**Minute 2 — Discover.** “After parsing decimal commas and grouping repeated timestamps, I found 49.7% of recorded hourly means above that line. The longest sequence contains 88 hourly labels. I preserve the March data gap and avoid counting every repeated row as a new sample.”

**Minute 3 — Investigate.** Select the longest sequence and switch the condition tabs. “Air flow in Column 01 averaged about 10% higher than in the preceding week. That is a lead to discuss with engineers. Timing, changing feed and operator response prevent me from calling it a cause. Many labels in this period also appear interpolated.”

**Minute 4 — Recommend.** “I would first reconcile lab timing and operating logs, then validate candidate factors with process engineers, and evaluate a monitoring pilot with an agreed response process.”

**Minute 5 — Evaluate value.** Change the reduction slider. “This is a transparent what-if calculation. The dataset supplies the recorded-hour count, while improvement, avoidable costs and implementation spend are assumptions. Actual financial benefits need plant-specific validation.”
