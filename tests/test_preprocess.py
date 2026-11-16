"""Small artificial fixtures ONLY test parsing/boundaries; never used by the site."""
import csv
import importlib.util
import json
import math
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('preprocess', ROOT / 'scripts/preprocess.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class PreprocessChecks(unittest.TestCase):
    def fixture(self, rows):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / 'fixture.csv'
        with path.open('w', newline='') as handle:
            writer = csv.writer(handle)
            writer.writerow(p.HEADER)
            for t, silica in rows:
                writer.writerow([t] + ['1,5'] * 22 + [str(silica).replace('.', ',')])
        return path

    def test_decimal_commas_and_repeat_timestamps(self):
        source = self.fixture([('2017-01-01 00:00:00', 1.5), ('2017-01-01 00:00:00', 2.5)])
        hours, audit = p.parse_csv(source)
        self.assertEqual(len(hours), 1)
        self.assertEqual(hours[0]['silica'], 2)
        self.assertEqual(hours[0]['rows'], 2)
        self.assertEqual(hours[0]['air'], 1.5)
        self.assertEqual(audit['varyingSilicaHours'], 1)
        self.assertFalse(p.elevated(hours[0]['silica']))

    def test_gap_and_exact_threshold_end_runs(self):
        records = [dict(t=i*p.HOUR, silica=v) for i, v in [(0, 3), (1, 3), (3, 3), (4, 2), (5, 3)]]
        self.assertEqual([r['hours'] for r in p.runs(records, lambda h: p.elevated(h['silica']))], [2, 1, 1])

    def test_duplicates_are_reported_and_retained(self):
        source = self.fixture([('2017-01-01 00:00:00', 3)] * 2 + [('2017-01-01 02:00:00', 4)])
        hours, audit = p.parse_csv(source)
        self.assertEqual(audit['exactDuplicateRows'], 1)
        self.assertEqual(hours[0]['rows'], 2)
        self.assertEqual(audit['missingHours'], 1)

    def test_unsorted_timestamps_fail_loudly(self):
        with self.assertRaisesRegex(ValueError, 'not ordered'):
            p.parse_csv(self.fixture([('2017-01-02 00:00:00', 3), ('2017-01-01 00:00:00', 2)]))

    def test_nonfinite_and_subhour_timestamps_fail(self):
        with self.assertRaisesRegex(ValueError, 'Nonfinite'):
            p.parse_csv(self.fixture([('2017-01-01 00:00:00', math.inf)]))
        with self.assertRaisesRegex(ValueError, 'Non-hour'):
            p.parse_csv(self.fixture([('2017-01-01 00:30:00', 3)]))

    def test_source_identity_and_independently_supplied_aggregation_reconcile(self):
        summary = json.loads((ROOT / 'public/data/summary.json').read_text())
        prior_audit = json.loads((ROOT / 'tests/reference/audit_summary.json').read_text())
        self.assertEqual(summary['source']['sha256'], prior_audit['source_sha256'])
        self.assertEqual(summary['audit']['rawRows'], prior_audit['raw_rows'])
        data = json.loads((ROOT / 'public/data/hourly.json').read_text())
        hours = {p.label(r[0]): dict(zip(data['columns'], r)) for r in data['rows']}
        with (ROOT / 'tests/reference/hourly_quality.csv').open() as handle:
            prior = list(csv.DictReader(handle))
        self.assertEqual(len(hours), len(prior))
        for row in prior:
            key = row['date'].replace(' ', 'T')[:16]
            # Targets are constant or linear within an hour, so their means and
            # independently computed medians reconcile, to exported precision.
            self.assertAlmostEqual(hours[key]['silica'], float(row['% Silica Concentrate']), places=8)
            self.assertEqual(hours[key]['rows'], int(row['raw_rows']))


if __name__ == '__main__':
    unittest.main()
