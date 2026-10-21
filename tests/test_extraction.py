"""Focused regressions: explicit corrections and non-destructive Unicode handling."""
import copy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.extract_pdf import apply_user_corrections, normalize


class CorrectionTests(unittest.TestCase):
    def fixtures(self):
        return [json.loads((ROOT / path).read_text(encoding="utf-8")) for path in
                ["questions.json", "reports/data-validation.json", "reports/source-map.json"]]

    def test_only_explicit_answer_changes_and_no_pdf_read(self):
        questions, report, evidence = self.fixtures()
        original = copy.deepcopy(questions)
        next(q for q in questions if q["id"] == "chuong3-cau157")["correctAnswer"] = None
        raw_rows = copy.deepcopy(evidence["answerRows"])
        with patch("scripts.extract_pdf.pdfplumber.open", side_effect=AssertionError("Must not open PDF")):
            result, audit, source = apply_user_corrections(questions, report, evidence)
            self.assertEqual(result, original)
            self.assertTrue(audit["strictValid"])
            self.assertEqual(audit["playableCount"], 511)
            self.assertEqual(source["answerRows"], raw_rows)
            self.assertEqual(audit["uniqueAnswerCount"], 510)
            first = copy.deepcopy((result, audit, source))
            self.assertEqual(apply_user_corrections(result, audit, source), first)

    def test_corrections_bound_to_source_and_exact_option_set(self):
        questions, report, evidence = self.fixtures()
        report["sourceSha256"] = "different source"
        with self.assertRaises(ValueError):
            apply_user_corrections(questions, report, evidence)
        questions, report, evidence = self.fixtures()
        next(q for q in questions if q["id"] == "chuong2-cau88")["options"]["D"] = "invented"
        with self.assertRaises(ValueError):
            apply_user_corrections(questions, report, evidence)

    def test_nfc_preserves_real_word_boundaries_without_guessing(self):
        self.assertEqual(normalize("Triê\u0301t học"), "Triết học")
        self.assertEqual(normalize("lực lượng sản xuất"), "lực lượng sản xuất")
        self.assertEqual(normalize("Triế t"), "Triế t")
        self.assertEqual(normalize("  thế\n giới\u00a0khách quan  "), "thế giới khách quan")


if __name__ == "__main__":
    unittest.main()
