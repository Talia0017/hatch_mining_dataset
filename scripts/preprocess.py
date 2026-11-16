#!/usr/bin/env python3
"""Build small, auditable website data from the ORIGINAL decimal-comma CSV.

Python 3.9+ standard library only. Never uses the older project's 3% outputs.
The ordered CSV is streamed one hour at a time; no raw data reaches the browser.
"""
import argparse
import csv
import hashlib
import json
import math
import os
import statistics
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THRESHOLD = 2.0
HOUR = 3_600_000
EPOCH = datetime(1970, 1, 1)
HEADER = ['date', '% Iron Feed', '% Silica Feed', 'Starch Flow', 'Amina Flow',
          'Ore Pulp Flow', 'Ore Pulp pH', 'Ore Pulp Density'] + [
    f'Flotation Column {i:02d} Air Flow' for i in range(1, 8)] + [
    f'Flotation Column {i:02d} Level' for i in range(1, 8)] + [
    '% Iron Concentrate', '% Silica Concentrate']
COLUMNS = ['t', 'silica', 'iron', 'air', 'amina', 'starch', 'ph', 'rows',
           'silicaUnique', 'ironUnique']


def mean(values):
    return math.fsum(values) / len(values) if values else None


def elevated(value):
    # Guard against arithmetic roundoff at an EXACT illustrative threshold.
    return value is not None and value > THRESHOLD + 1e-10


def stamp(text):
    dt = datetime.strptime(text, '%Y-%m-%d %H:%M:%S')
    if dt.minute or dt.second:
        raise ValueError('Non-hour timestamp: review grouping policy before proceeding.')
    # A coordinate, NOT a claim that the source's unknown timezone is UTC.
    return int((dt - EPOCH).total_seconds() * 1000)


def label(t):
    return (EPOCH + timedelta(milliseconds=t)).isoformat(timespec='minutes')


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def runs(hours, predicate):
    output, current = [], []
    for h in hours:
        if current and (h['t'] - current[-1]['t'] != HOUR or not predicate(h)):
            output.append(current)
            current = []
        if predicate(h):
            current.append(h)
    if current:
        output.append(current)
    return sorted([{'start': r[0]['t'], 'end': r[-1]['t'], 'hours': len(r),
                    'meanSilica': mean([h['silica'] for h in r])}
                   for r in output], key=lambda r: (-r['hours'], r['start']))


def parse_csv(source):
    hours, gaps = [], []
    audit = {'rawRows': 0, 'exactDuplicateRows': 0, 'varyingSilicaHours': 0,
             'varyingIronHours': 0, 'linearVaryingSilicaHours': 0,
             'linearVaryingIronHours': 0, 'missingCells': 0,
             'invalidCells': 0, 'columns': len(HEADER)}
    bounds = {name: {'min': math.inf, 'max': -math.inf} for name in HEADER[1:]}
    dedup_means = []

    def finish(time_text, rows):
        if not rows:
            return
        t = stamp(time_text)
        if hours and t <= hours[-1]['t']:
            raise ValueError('CSV hours are not ordered. Stable-sort by date before processing.')
        if hours and t - hours[-1]['t'] > HOUR:
            gaps.append({'start': hours[-1]['t'] + HOUR, 'end': t - HOUR,
                         'hours': (t - hours[-1]['t']) // HOUR - 1})
        transposed = list(zip(*rows))
        unique_silica = len(set(transposed[22]))
        unique_iron = len(set(transposed[21]))
        for index, key, n in [(22, 'Silica', unique_silica), (21, 'Iron', unique_iron)]:
            if n > 1:
                audit[f'varying{key}Hours'] += 1
                y = transposed[index]
                error = max(abs(v - (y[0] + (y[-1] - y[0]) * i / (len(y) - 1)))
                            for i, v in enumerate(y))
                audit[f'linearVarying{key}Hours'] += int(error < 1e-8)
        unique_rows = set(rows)
        audit['exactDuplicateRows'] += len(rows) - len(unique_rows)
        dedup_means.append(mean([r[22] for r in unique_rows]))
        hours.append({'t': t, 'silica': mean(transposed[22]), 'iron': mean(transposed[21]),
                      'air': mean(transposed[7]), 'amina': mean(transposed[3]),
                      'starch': mean(transposed[2]), 'ph': mean(transposed[5]),
                      'rows': len(rows), 'silicaUnique': unique_silica, 'ironUnique': unique_iron})

    with source.open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.reader(handle)
        if next(reader) != HEADER:
            raise ValueError('Expected the original 24-column mining CSV schema.')
        current, group = None, []
        for line_number, row in enumerate(reader, start=2):
            if len(row) != len(HEADER):
                raise ValueError(f'Invalid field count at line {line_number}.')
            if any(cell.strip() == '' for cell in row):
                raise ValueError(f'Missing value at line {line_number}; no imputation is performed.')
            if row[0] != current:
                finish(current, group)
                current, group = row[0], []
            values = tuple(float(cell.replace(',', '.')) for cell in row[1:])
            if not all(math.isfinite(v) for v in values):
                raise ValueError(f'Nonfinite numeric value at line {line_number}.')
            for name, value in zip(HEADER[1:], values):
                bounds[name]['min'] = min(bounds[name]['min'], value)
                bounds[name]['max'] = max(bounds[name]['max'], value)
            group.append(values)
            audit['rawRows'] += 1
        finish(current, group)
    if not hours:
        raise ValueError('No usable records in the CSV.')
    audit.update({'numericRanges': bounds, 'gaps': gaps,
                  'missingHours': sum(g['hours'] for g in gaps),
                  'observedHours': len(hours),
                  'rowsPerHour': {'min': min(h['rows'] for h in hours),
                                 'median': statistics.median(h['rows'] for h in hours),
                                 'max': max(h['rows'] for h in hours)},
                  'deduplicatedSensitivity': {'averageSilica': mean(dedup_means),
                                             'elevatedHours': sum(map(elevated, dedup_means))}})
    return hours, audit


def summarize(hours, audit):
    elevated_runs = runs(hours, lambda h: elevated(h['silica']))
    constant_hours = [h for h in hours if h['silicaUnique'] == 1]
    days = {}
    for h in hours:
        days.setdefault(h['t'] // (24 * HOUR) * 24 * HOUR, []).append(h)
    daily = []
    for t in range(min(days), max(days) + 24 * HOUR, 24 * HOUR):
        group = days.get(t, [])
        daily.append({'t': t, 'silica': mean([h['silica'] for h in group]),
                      'hours': len(group), 'above': sum(elevated(h['silica']) for h in group),
                      'varying': sum(h['silicaUnique'] > 1 for h in group)})
    holds, hold = [], []
    for h in hours:
        if hold and (h['t'] - hold[-1]['t'] != HOUR or
                     abs(h['silica'] - hold[-1]['silica']) > 1e-9):
            holds.append(hold)
            hold = []
        hold.append(h)
    holds.append(hold)
    longest_hold = max(holds, key=len)
    return {'threshold': THRESHOLD, 'start': hours[0]['t'], 'end': hours[-1]['t'],
            'averageSilica': mean([h['silica'] for h in hours]),
            'observedHours': len(hours), 'elevatedHours': sum(r['hours'] for r in elevated_runs),
            'elevatedShare': sum(r['hours'] for r in elevated_runs) / len(hours),
            'longestRun': elevated_runs[0] if elevated_runs else None,
            'runs': elevated_runs[:5], 'runCount': len(elevated_runs),
            'constantOnly': {'hours': len(constant_hours),
                             'elevatedHours': sum(elevated(h['silica']) for h in constant_hours),
                             'averageSilica': mean([h['silica'] for h in constant_hours])},
            'longestHold': {'hours': len(longest_hold), 'silica': longest_hold[0]['silica'],
                            'start': longest_hold[0]['t'], 'end': longest_hold[-1]['t']},
            'daily': daily, 'audit': audit}


def write_json(path, value):
    path.write_text(json.dumps(value, separators=(',', ':'), allow_nan=False) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, help='Path to the original source CSV')
    parser.add_argument('--output', type=Path, default=ROOT / 'public' / 'data')
    args = parser.parse_args()
    candidates = [args.input, Path(os.environ['MINING_DATA_PATH']) if os.environ.get('MINING_DATA_PATH') else None,
                  ROOT / 'data' / 'MiningProcess_Flotation_Plant_Database.csv',
                  Path.home() / 'Downloads' / 'MiningProcess_Flotation_Plant_Database.csv']
    source = next((p for p in candidates if p and p.is_file()), None)
    if args.input and not args.input.is_file():
        parser.error(f'Input file not found: {args.input}')
    if source is None:
        parser.error('Original CSV missing. Supply --input or MINING_DATA_PATH; no synthetic fallback exists.')
    print(f'Inspecting original CSV: {source}', flush=True)
    hours, audit = parse_csv(source)
    summary = summarize(hours, audit)
    summary['source'] = {'filename': source.name, 'bytes': source.stat().st_size,
                         'sha256': sha256(source), 'timezone': 'unspecified',
                         'aggregation': 'Arithmetic mean within each observed hour; each hour has equal weight.',
                         'schemaVersion': 1}
    args.output.mkdir(parents=True, exist_ok=True)
    # Preserve numeric precision; compact positional records avoid repeated object keys.
    write_json(args.output / 'hourly.json', {'columns': COLUMNS,
               'rows': [[h[k] for k in COLUMNS] for h in hours]})
    write_json(args.output / 'summary.json', summary)
    with (args.output / 'hourly.csv').open('w', newline='') as handle:
        writer = csv.writer(handle)
        writer.writerow(['source_time'] + COLUMNS[1:])
        for h in hours:
            writer.writerow([label(h['t'])] + [h[k] for k in COLUMNS[1:]])
    # Reconcile primary accounting identities before accepting the output.
    assert sum(h['rows'] for h in hours) == audit['rawRows']
    assert len(hours) + audit['missingHours'] == (hours[-1]['t'] - hours[0]['t']) // HOUR + 1
    assert sum(d['above'] for d in summary['daily']) == summary['elevatedHours']
    assert sum(d['hours'] for d in summary['daily']) == len(hours)
    print(json.dumps({k: summary[k] for k in ['averageSilica', 'observedHours', 'elevatedHours',
                                             'elevatedShare', 'longestRun', 'constantOnly', 'longestHold']}, indent=2))
    print(f"Audit: {audit['rawRows']:,} rows; {audit['missingHours']} missing hours; "
          f"{audit['varyingSilicaHours']} varying-label hours; {audit['exactDuplicateRows']} exact duplicates.")
    print(f"Frontend JSON: {sum(p.stat().st_size for p in args.output.glob('*.json')):,} bytes")


if __name__ == '__main__':
    main()
