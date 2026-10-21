"""Extract the supplied bank without inventing missing text or answers.

Default: write every source question plus explicit owner corrections and an
audit. --check compares saved JSON with a fresh PDF extraction plus corrections.
--apply-corrections uses saved JSON/evidence only, without opening the PDF.
Only whitespace and Unicode NFC are normalized. Page numbers are removed.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {1: 168, 2: 155, 3: 188}
LETTERS = set("ABCD")


def normalize(text):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()


def extract(pdf_path):
    questions, issues, answer_rows = [], [], []
    provenance, headers, table_pages = {}, {}, defaultdict(list)
    chapter, mode, current, field = 0, None, None, "question"

    def issue(code, message, qid=None, pages=None, severity="error"):
        issues.append(dict(code=code, severity=severity, id=qid, pages=pages or [], message=message))

    with pdfplumber.open(pdf_path) as pdf:
        page_count = len(pdf.pages)
        for page_no, page in enumerate(pdf.pages, 1):
            lines = unicodedata.normalize("NFC", page.extract_text(x_tolerance=2, y_tolerance=3) or "").splitlines()
            if lines and lines[-1].strip() == str(page_no):
                lines.pop()
            chapter_match = re.match(r"^CHƯƠNG\s+(\d+)\s*:", lines[0] if lines else "")
            if chapter_match:
                chapter = int(chapter_match[1])
                mode, current = "questions", None
                headers[chapter] = []
            if any(line.strip() == "GỢI Ý ĐÁP ÁN" for line in lines):
                mode, current = "answers", None
            if mode == "answers":
                table_pages[chapter].append(page_no)
                text_pairs = []
                for line in lines:
                    line = line.strip()
                    if not line or line == "GỢI Ý ĐÁP ÁN":
                        continue
                    pairs = re.findall(r"Câu\s+(\d+)\s+([A-D])\b", line)
                    if not re.fullmatch(r"(?:Câu\s+\d+\s+[A-D]\s*)+", line):
                        issue("unparsed_answer_text", f"Không đọc hết dòng bảng: {line}", pages=[page_no])
                    text_pairs.extend((int(n), a) for n, a in pairs)
                # Independent coordinate/table extraction must agree with text parsing.
                cell_pairs = []
                for table in page.extract_tables():
                    for row in table:
                        for col in range(0, len(row) - 1, 2):
                            label, answer = normalize(row[col] or ""), normalize(row[col + 1] or "")
                            if not label and not answer:
                                continue
                            m = re.fullmatch(r"Câu\s+(\d+)", label)
                            if not m or answer not in LETTERS:
                                issue("invalid_table_cell", f"Ô bảng không hợp lệ: {label!r} / {answer!r}", pages=[page_no])
                            else:
                                cell_pairs.append((int(m[1]), answer))
                if Counter(cell_pairs) != Counter(text_pairs):
                    issue("table_extraction_mismatch", "Trích xuất theo ô bảng và văn bản không khớp.", pages=[page_no])
                for number, answer in text_pairs:
                    answer_rows.append(dict(chapter=chapter, number=number, answer=answer, page=page_no))
                continue
            if mode != "questions":
                continue
            for raw_line in lines:
                line = raw_line.strip()
                # C1 Q86 has no ':' or '.' after its number in the source.
                match = re.match(r"^Câu\s+(\d+)(?:\s*[:.]\s*|\s+)(.*)$", line)
                if match:
                    number = int(match[1])
                    qid = f"chuong{chapter}-cau{number}"
                    current = dict(id=qid, chapter=chapter, number=number, question=match[2], options={}, correctAnswer=None)
                    questions.append(current)
                    provenance[qid] = [page_no]
                    field = "question"
                    if not re.match(r"^Câu\s+\d+\s*[:.]", line):
                        issue("question_label", "Nhãn câu không có dấu ':' hoặc '.'; nhận diện theo số câu, giữ nguyên nội dung.", qid, [page_no], "info")
                    continue
                if current is None:
                    if line:
                        headers[chapter].append(line)
                    continue
                if not line:
                    continue
                if page_no not in provenance[current["id"]]:
                    provenance[current["id"]].append(page_no)
                option = re.match(r"^([A-D])[.)]\s*(.*)$", line)
                if option:
                    field = option[1]
                    if field in current["options"]:
                        issue("duplicate_option_label", f"Nhãn {field} xuất hiện hai lần; cần kiểm tra.", current["id"], [page_no])
                        current["options"][field] += " " + option[2]
                    else:
                        current["options"][field] = option[2]
                elif field == "question":
                    current["question"] += " " + line
                else:
                    current["options"][field] += " " + line

    indexed_answers = defaultdict(list)
    for row in answer_rows:
        indexed_answers[(row["chapter"], row["number"])].append(row)
    for question in questions:
        qid = question["id"]
        question["question"] = normalize(question["question"])
        question["options"] = {k: normalize(v) for k, v in question["options"].items()}
        rows = indexed_answers[(question["chapter"], question["number"])]
        choices = {row["answer"] for row in rows}
        if len(choices) == 1:
            question["correctAnswer"] = next(iter(choices))
        if not rows:
            issue("missing_answer", "Không có nhãn câu này trong bảng đáp án của chương; correctAnswer = null.", qid, table_pages[question["chapter"]])
        elif len(choices) > 1:
            issue("conflicting_answer", "Bảng nguồn ghi nhiều đáp án khác nhau; correctAnswer = null.", qid, [r["page"] for r in rows])
        elif len(rows) > 1:
            issue("duplicate_answer", f"Bảng nguồn ghi nhãn câu {question['number']} {len(rows)} lần, cùng đáp án {question['correctAnswer']}. Không đổi nhãn sang câu khác.", qid, [r["page"] for r in rows], "warning")
        missing = LETTERS - question["options"].keys()
        if missing:
            issue("missing_options", f"PDF thiếu lựa chọn {', '.join(sorted(missing))}; không thêm lựa chọn giả.", qid, provenance[qid])
        if not question["question"] or any(not v for v in question["options"].values()):
            issue("empty_content", "Nội dung câu hoặc lựa chọn rỗng.", qid, provenance[qid])
        if len(set(question["options"].values())) != len(question["options"]):
            issue("identical_options", "Có các lựa chọn trùng nguyên văn trong nguồn; giữ nguyên, cần kiểm tra thủ công.", qid, provenance[qid], "warning")
        if any("\ufffd" in t or "(cid:" in t for t in [question["question"], *question["options"].values()]):
            issue("unreadable_glyph", "Phát hiện ký tự không giải mã được.", qid, provenance[qid])
    counts = Counter(q["chapter"] for q in questions)
    if page_count != 113:
        issue("page_count", f"Cần 113 trang, thực tế {page_count}.")
    if len(questions) != 511:
        issue("total_count", f"Cần 511 câu, thực tế {len(questions)}.")
    if len({q["id"] for q in questions}) != len(questions):
        issue("duplicate_id", "Có ID câu hỏi bị trùng.")
    for ch, expected in EXPECTED.items():
        numbers = [q["number"] for q in questions if q["chapter"] == ch]
        if sorted(numbers) != list(range(1, expected + 1)):
            issue("chapter_sequence", f"Chương {ch}: số câu phải liên tục 1–{expected}, thực tế {len(numbers)} câu.")
    known_keys = {(q["chapter"], q["number"]) for q in questions}
    for key, rows in indexed_answers.items():
        if key not in known_keys:
            issue("orphan_answer", f"Bảng có đáp án cho câu không tồn tại: {key}.", pages=[r["page"] for r in rows])
    blocked = {i["id"] for i in issues if i["severity"] == "error" and i["id"]}
    report = dict(
        source=pdf_path.name, sourceSha256=hashlib.sha256(pdf_path.read_bytes()).hexdigest(), pages=page_count,
        totalQuestions=len(questions), chapterCounts=dict(counts),
        answerRowCount=len(answer_rows), uniqueAnswerCount=sum(bool(rows) for rows in indexed_answers.values()),
        strictValid=not any(i["severity"] == "error" for i in issues),
        playableCount=sum(q["id"] not in blocked for q in questions),
        excludedIds=sorted(blocked), issues=issues,
        checks=dict(total511=len(questions) == 511, uniqueIds=len({q["id"] for q in questions}) == len(questions),
                    fourOptions=all(set(q["options"]) == LETTERS for q in questions),
                    validAnswers=all(q["correctAnswer"] in LETTERS for q in questions),
                    chapterTablesAgree=not any(i["code"] in ("invalid_table_cell", "table_extraction_mismatch", "unparsed_answer_text") for i in issues)),
        chapters={str(ch): dict(title=normalize(" ".join(headers[ch])), expected=count, answerPages=table_pages[ch]) for ch, count in EXPECTED.items()},
    )
    evidence = dict(sourceSha256=report["sourceSha256"], questionPages=provenance, answerRows=answer_rows)
    return apply_user_corrections(questions, report, evidence)


def apply_user_corrections(questions, report, evidence):
    """Apply only documented, source-bound user decisions; never infer missing text.

    Retains the raw PDF answer rows. In particular the owner-provided answer for
    C3 Q157 is not presented as a row found in the PDF.
    """
    corrections = json.loads((ROOT / "data/corrections.json").read_text(encoding="utf-8"))
    if corrections["sourceSha256"] != report["sourceSha256"] or evidence["sourceSha256"] != report["sourceSha256"]:
        raise ValueError("Đính chính không thuộc đúng phiên bản PDF đã kiểm tra.")
    by_id = {q["id"]: q for q in questions}
    if len(by_id) != 511 or len(questions) != 511 or any(
        sorted(q["number"] for q in questions if q["chapter"] == ch) != list(range(1, count + 1))
        for ch, count in EXPECTED.items()
    ):
        raise ValueError("Dữ liệu đã lưu không có đủ 511 câu duy nhất, đúng thứ tự số câu từng chương.")
    resolved_codes = {
        "chuong2-cau88": {"missing_options"},
        "chuong3-cau157": {"missing_answer"},
        "chuong3-cau167": {"duplicate_answer"},
        "chuong1-cau62": {"identical_options"},
    }
    for qid, correction in corrections["questions"].items():
        q = by_id[qid]
        if "optionKeys" in correction and set(q["options"]) != set(correction["optionKeys"]):
            raise ValueError(f"{qid}: lựa chọn hiện tại khác xác nhận của người dùng.")
        if "correctAnswer" in correction:
            if correction["correctAnswer"] not in q["options"]:
                raise ValueError(f"{qid}: đáp án đính chính không tồn tại trong lựa chọn.")
            q["correctAnswer"] = correction["correctAnswer"]
    issues = [i for i in report["issues"]
              if i["code"] not in resolved_codes.get(i["id"], set())
              and i["code"] not in {"user_correction", "saved_validation"}]
    for qid, correction in corrections["questions"].items():
        issues.append(dict(code="user_correction", severity="info", id=qid,
                           pages=evidence["questionPages"][qid], message=correction["note"]))
    source_answers = defaultdict(set)
    for row in evidence["answerRows"]:
        source_answers[(row["chapter"], row["number"])].add(row["answer"])
    expected_options_ok, answer_evidence_ok = True, True
    for q in questions:
        decision = corrections["questions"].get(q["id"], {})
        keys = set(decision.get("optionKeys", "ABCD"))
        if set(q["options"]) != keys or q["correctAnswer"] not in keys:
            expected_options_ok = False
            issues.append(dict(code="saved_validation", severity="error", id=q["id"],
                               pages=evidence["questionPages"][q["id"]], message="Lựa chọn hoặc đáp án không đúng cấu trúc đã xác nhận."))
        expected_answer = {decision["correctAnswer"]} if "correctAnswer" in decision else source_answers[(q["chapter"], q["number"])]
        if expected_answer != {q["correctAnswer"]}:
            answer_evidence_ok = False
            issues.append(dict(code="saved_validation", severity="error", id=q["id"],
                               pages=evidence["questionPages"][q["id"]], message="Đáp án không khớp bảng cùng chương hoặc đính chính đã lưu."))
    report["sourcePdfStrictValid"] = report.get("sourcePdfStrictValid", report["strictValid"])
    report["validationBasis"] = "PDF gốc + đính chính trực tiếp của người dùng trong data/corrections.json"
    report["issues"] = issues
    report["excludedIds"] = sorted({i["id"] for i in issues if i["severity"] == "error" and i["id"]})
    report["playableCount"] = sum(q["id"] not in report["excludedIds"] for q in questions)
    report["strictValid"] = not any(i["severity"] == "error" for i in issues)
    report["uniqueAnswerCount"] = len(source_answers)
    report["checks"].update(
        fourOptions=all(set(q["options"]) == LETTERS for q in questions),
        validAnswers=all(q["correctAnswer"] in q["options"] for q in questions),
        approvedOptionSets=expected_options_ok,
        answersMatchSourceOrCorrection=answer_evidence_ok,
    )
    report["userCorrections"] = corrections
    evidence["userCorrections"] = corrections
    return questions, report, evidence


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_markdown(report, path):
    lines = ["# Báo cáo dữ liệu PDF", "", f"Nguồn: `{report['source']}` — {report['pages']} trang.",
             f"SHA-256: `{report['sourceSha256']}`", "",
             f"Trích xuất **{report['totalQuestions']} câu**; có **{report['playableCount']} câu đủ dữ liệu để chấm điểm**.",
             "**Kiểm tra theo PDF và đính chính được xác nhận: " + ("ĐẠT" if report["strictValid"] else "KHÔNG ĐẠT") + ".**", "",
             "| Chương | Số câu | Trang bảng đáp án |", "|---|---:|---|"]
    for ch, data in report["chapters"].items():
        count = report['chapterCounts'].get(ch, report['chapterCounts'].get(int(ch), 0))
        lines.append(f"| {ch} | {count} | {', '.join(map(str, data['answerPages']))} |")
    lines += ["", "## Kết quả tự động", ""]
    for key, passed in report["checks"].items():
        lines.append(f"- {key}: {'ĐẠT' if passed else 'KHÔNG ĐẠT'}")
    lines += ["", "`fourOptions = false` là thông tin đúng: chương 2 câu 88 có ba lựa chọn, đã được người dùng xác nhận; kiểm tra cấu trúc được chấp nhận là `approvedOptionSets`.",
              "", "## Đối chiếu và đính chính", "", "| Mức | Câu | Trang PDF | Chi tiết |", "|---|---|---|---|"]
    for item in report["issues"]:
        lines.append(f"| {item['severity']} | {item['id'] or 'Toàn bộ'} | {', '.join(map(str, item['pages']))} | {item['message']} |")
    lines += ["", "## Cách xử lý", "",
              "- `questions.json` lưu đủ 511 câu theo thứ tự. Chương 2 câu 88 chỉ có A/B/C, đúng là C. Không thêm lựa chọn D.",
              "- Chương 3 câu 157 được bổ sung B theo xác nhận trực tiếp của người dùng; câu 167 giữ B. Không sửa hay đổi nhãn các dòng bảng PDF.",
              "- Chương 1 câu 62 giữ nguyên A/B trùng nội dung; người dùng đã xác nhận điều này không ảnh hưởng.",
              "- `data/corrections.json` lưu nguồn, SHA-256 và nội dung đính chính; `source-map.json` giữ riêng bằng chứng PDF gốc và xác nhận người dùng. PDF riêng lẻ vẫn có ngoại lệ, không được tuyên bố đủ bốn lựa chọn cho mọi câu.",
              "- Bảng được đọc độc lập bằng văn bản và tọa độ ô; hai kết quả phải khớp. `source-map.json` lưu trang của từng câu và từng dòng đáp án.",
              "- Chỉ nối dòng, chuẩn hóa khoảng trắng và Unicode NFC. Giữ nguyên lỗi chính tả, câu trùng và nội dung nguồn; không thêm giải thích.",
              "- Khi xáo trộn, ứng dụng giữ thứ tự lựa chọn nếu câu có tham chiếu chữ A/B/C/D hoặc vị trí ‘trên/dưới’, nhằm bảo toàn ý nghĩa.",
              "- Đã xem ảnh các bảng đáp án và trang 19, 55 để xác minh nhãn câu 86, lựa chọn D bị thiếu và nhãn 167 bị lặp. Báo cáo không khẳng định đã thẩm định kiến thức của tài liệu.",
              "- Lần cập nhật đính chính sử dụng dữ liệu và bằng chứng đã lưu; không đọc/trích xuất lại toàn bộ PDF.", ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, default=ROOT / "511 câu hỏi trắc nghiệm triết học.pdf")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Re-extract plus corrections and compare; never replace questions.json")
    mode.add_argument("--apply-corrections", action="store_true", help="Apply owner corrections to saved data/evidence without reading the PDF")
    args = parser.parse_args()
    try:
        if args.apply_corrections:
            read_json = lambda path: json.loads((ROOT / path).read_text(encoding="utf-8"))
            questions, report, evidence = apply_user_corrections(
                read_json("questions.json"), read_json("reports/data-validation.json"), read_json("reports/source-map.json"))
        else:
            questions, report, evidence = extract(args.pdf)
        if args.check:
            saved = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
            if saved != questions:
                print("ERROR: questions.json không khớp nội dung trích xuất từ PDF.", file=sys.stderr)
                return 2
        else:
            write_json(ROOT / "questions.json", questions)
        write_json(ROOT / "reports/data-validation.json", report)
        write_json(ROOT / "reports/source-map.json", evidence)
        write_markdown(report, ROOT / "reports/data-validation.md")
        print(f"Đã kiểm tra {len(questions)} câu; {report['playableCount']} câu có thể chấm điểm.")
        for item in report["issues"]:
            print(f"{item['severity'].upper()} {item['id'] or ''}: {item['message']}")
        print("STRICT: " + ("PASS" if report["strictValid"] else "FAIL — xem reports/data-validation.md"))
        return 0 if report["strictValid"] else 1
    except (OSError, ValueError, KeyError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main())
