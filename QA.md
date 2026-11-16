# Verification record

Verified on **15 November 2026 (America/Toronto)**.

## Data and calculation checks

- Processed the complete original 183,766,261-byte CSV directly using `scripts/preprocess.py`.
- SHA-256 matches the independently supplied prior project audit.
- Reconciled all 737,453 rows to 4,097 hourly records, plus the 318-hour coverage gap.
- Compared all 4,097 exported silica means with the prior project's independently generated hourly silica medians. Values agree to the exported precision because the quality labels within each hour are constant or linear.
- Ran **8 JavaScript tests**: all passed. They check primary metrics, daily reconciliation, gap-aware longest sequences, preceding-week boundaries, missing selections, scenario arithmetic, invalid inputs and stable time coordinates.
- Ran **6 Python tests**: all passed. They check decimal parsing, repeated timestamps, exact duplicates, gap/run boundaries, invalid inputs and reconciliation with the prior analysis.
- Ran `npm run build`: passed with a production static bundle.
- The local development server returned **HTTP 200** at `http://127.0.0.1:5173/`.
- Fonts, application code and JSON are local assets. The source has no runtime external HTTP API or font request.

## Actual Chrome interaction checks

The browser's native accessibility interface was used when its DOM automation interface was unavailable. Actions were checked against the visible page state.

| Interaction | Observed result |
| --- | --- |
| Open page | All three sections, KPIs and the plotted daily history rendered |
| Chart month window | May 2017 displayed its daily history; returned to Full history |
| Click the daily chart | Selected 16 May 2017; tooltip displayed 1.75% silica; investigation updated to 24 recorded hours, 8 above 2% |
| Date picker | Selecting 20 March 2017 displayed “No recorded hours in this period,” with no imputed zero measurement |
| Restore longest sequence | Returned to 21–24 April and 88 selected hourly labels |
| Amina tab | 516.7 selected vs. 483.5 baseline; +6.9%; interpretation updated |
| Starch tab | 1,876.5 vs. 1,931.9; −2.9%; interpretation updated |
| pH tab | 9.608 vs. 9.594; +0.014 pH units; small-difference interpretation displayed |
| Air flow | Initial comparison displayed 265.9 vs. 241.8; +10.0% |
| Empty numeric fields | Validation messages displayed; financial outputs became unavailable |
| Slider at 0% | $0 avoided cost and −$50,000 net benefit with the default cost inputs |
| Slider at 100% | $1,018,000 avoided cost and $968,000 net benefit |
| Restore 10% | $101,800 avoided cost and $51,800 net benefit |
| Responsive viewport | Inspected 390 × 844 CSS-pixel layout; sections stacked and controls remained visible |
| Custom range on mobile | Applied 20–24 April; updated to 120 observed hours, 114 above 2% |
| Methodology disclosure | Expanded to show the gap, interpolation-like labels, 45.7% sensitivity figure and data download links |

The temporary viewport override was reset after checking mobile. A desktop screenshot was saved locally during the original verification. Screenshots containing browser chrome are excluded from the repository.

## Verification limits

- This is a local historical case study; it was not deployed or validated as a live plant system.
- Chrome was visually inspected on this Mac, including an emulated mobile width. Physical phones, Safari, Firefox and print output were not separately tested.
- The 2% line, financial inputs and possible improvements are illustrative. Software verification does not establish a real quality specification, a causal operating recommendation or actual savings.
