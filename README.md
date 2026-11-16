# Iron Ore Processing: From Data to Business Decisions

A local, interactive React case study for Steven's Advisory Analyst interview. The three sections—Discover, Investigate, Recommend—use the original mining CSV and a clearly labeled hypothetical financial scenario. All webpage content is in English.

## Run the website

Requires Node.js 20.19+ (or a supported newer version) and npm. The processed data are included; Python and the raw CSV are **not needed just to open the website**.

```bash
git clone https://github.com/Talia0017/hatch_mining_dataset.git
cd hatch_mining_dataset
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. Keep the terminal running; stop it with Ctrl+C. If port 5173 is occupied, stop the existing instance or run `npm run dev -- --port 5174` and use the printed address.

To build and inspect the production bundle:

```bash
npm run build
npm run preview
```

The production preview is at http://127.0.0.1:4173/. `dist/` contains a static site that can be served by any static HTTP server. Opening `index.html` with `file://` will not load its JSON correctly. No backend, authentication, remote API or runtime internet access is required. Fonts are bundled locally; the initial npm install needs internet access.

## Interactions

- Hover over the daily trend to see the daily average and how many recorded hours exceeded 2%.
- Click a recorded day, or use the date picker, to update the selected period and the investigation below.
- Use the chart's month dropdown to inspect a smaller window. This changes only the chart window, not the full-history KPIs or calculator exposure.
- Open “Choose a different date range” to compare a custom period. “Use longest sequence” restores the default 88-hour sequence, including its precise starting and ending hours.
- Switch among air flow (Column 01), Amina flow, starch flow and pulp pH. Bars, values and observations update together.
- Change the improvement slider and cost assumptions. Zero, break-even, negative benefits, blank inputs and invalid negative costs are handled explicitly.
- Expand the formula or methodology notes for definitions and limitations. Downloadable hourly CSV and audit JSON are available there.

## Recreate the processed data

Python 3.9+; **standard library only**, no pandas installation required. The source is streamed one hour at a time. The script discovers the source in this repository's `data/` folder or `~/Downloads`, or accepts an explicit path / `MINING_DATA_PATH`.

```bash
python3 scripts/preprocess.py --input "/path/to/MiningProcess_Flotation_Plant_Database.csv"
```

The original file is read without modification. It contains 737,453 rows and 24 columns, occupies 183,766,261 bytes, and has SHA-256:

```text
ae0231a0bd2e14aac39cf978d81db6c71907a42aade19327816692c4e30cb956
```

The script writes:

| File | Purpose |
| --- | --- |
| `public/data/hourly.json` | 4,097 hourly records in compact column-array form; full numeric precision |
| `public/data/summary.json` | Daily trend, KPIs, runs, data provenance, gaps and audit |
| `public/data/hourly.csv` | Human-readable download with source clock labels |

The frontend requests approximately **463 KB of uncompressed JSON**, not the 184 MB CSV. Missing days use `null` to break the plotted line. No synthetic replacement data or generated operational samples are used.

The website uses **hourly arithmetic means and an illustrative 2% threshold**. The older notebook uses hourly medians and a 3% threshold for a different analysis. Its source and outputs remain unchanged in the original local analysis project. Do not mix those results with the website's results.

## Findings and limitations

See [FINDINGS.md](FINDINGS.md) for the numerical evidence, baseline comparison, source limitations and a short presentation guide. The headline metrics are **2.33% average silica**, **49.7% of observed hourly means above 2%**, and **88 consecutive elevated hourly labels**. These are historical descriptions, not product rejection rates or verified continuous operating events.

## Checks

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm run build
```

The eight JavaScript tests verify the actual exported data, daily/hourly reconciliation, gap-aware runs, selected-period boundaries, preceding-week comparisons, financial edge cases and timezone-stable coordinates. Six Python tests check decimal commas, repeated timestamps, duplicate retention, gaps, schema-related boundaries and reconciliation against the independently supplied analysis. The last check uses compact regression evidence in `tests/reference/`, extracted from the independently supplied earlier analysis.

Artificial rows appear **only in parser unit-test fixtures**, never in the webpage or processed operational data. Browser verification notes are recorded in [QA.md](QA.md). The original CSV and local browser screenshots are not published in this repository.

## Source map

```text
hatch_mining_dataset/
  src/
    App.jsx             Three-section story, charts, period controls, calculator
    analysis.mjs        Pure selection, aggregation and scenario functions
    main.jsx            React entry point and local fonts
    styles.css          Responsive layout, focus styles and print layout
  scripts/preprocess.py Original CSV → compact frontend data + audit
  public/data/          Included processed JSON and downloadable CSV
  tests/               Data reconciliation, boundary tests and reference evidence
  index.html
  vite.config.js
  package.json
  package-lock.json    Reproducible dependency versions
  FINDINGS.md
  QA.md
```

React, Vite, Recharts and Lucide are used. DM Sans and Manrope are bundled through Fontsource under their included OFL licenses. The project is an independent educational case study, not affiliated with Hatch or the anonymous plant.

## Deploy with Vercel

Import this GitHub repository and use the repository root. Select **Vite**, use `npm run build` as the build command, and `dist` as the output directory. No environment variables are needed. The committed processed JSON is used directly; the raw CSV does not need to run on the hosting service.
