# Sửa hiển thị tiếng Việt và áp dụng đính chính — 21/10/2026

## Nguyên nhân thực tế

Lỗi người dùng chỉ ra nằm ở tiêu đề đầu trang, không phải dữ liệu câu hỏi. DOM chứa `Triết` đúng NFC và không có khoảng trắng giữa `ế` và `t`. Tiêu đề/lời giới thiệu được viết trực tiếp trong `js/app.js`, không lấy từ PDF.

CSS cũ dùng `Georgia, "Times New Roman", serif` với `letter-spacing: -1.9px` ở desktop, `-1.5px` ở mobile. Kiểm tra bảng `cmap` trong font Windows cho thấy `georgia.ttf` không có glyph cho `ế` (U+1EBF), `ậ`, `ọ` và nhiều ký tự tiếng Việt mở rộng. `times.ttf`, `arial.ttf`, `segoeui.ttf` có các glyph được kiểm tra. Trình duyệt phải ghép glyph từ font dự phòng trong cùng một từ, tạo khoảng cách nhìn thấy rõ ở ảnh trước sửa: “Triế t”. `word-spacing` tính toán là 0 px; không có ký tự khoảng trắng bị JavaScript chèn vào.

Lời giới thiệu dùng Arial, khoảng cách chữ bình thường, `word-spacing: 0px`; không phát hiện lỗi dữ liệu hay glyph tương tự ở hai dòng này.

## Sửa trong phạm vi liên quan

- `style.css`: ưu tiên Times New Roman cho các tiêu đề tiếng Việt từng dùng Georgia; giữ bố cục và kiểu serif. Tiêu đề chính dùng `letter-spacing: normal`, `word-spacing: normal` ở desktop/mobile. Không thay font của nội dung câu hỏi đang hiển thị đúng.
- `questions.json`: chỉ bổ sung B cho chương 3 câu 157. Chương 2 câu 88 vẫn có đúng A/B/C và C là đáp án; chương 3 câu 167 giữ B; chương 1 câu 62 giữ nguyên A/B trùng.
- `data/corrections.json`: lưu riêng xác nhận người dùng, gắn SHA-256 của PDF.
- `scripts/extract_pdf.py`: áp dụng các xác nhận có nguồn; thêm `--apply-corrections` để cập nhật từ JSON/bằng chứng đã lưu mà không mở PDF. Giữ nguyên logic `normalize()` — không thêm regex xóa khoảng trắng trong từ. Giữ nguyên các dòng bảng PDF, không giả tạo dòng 157. Sửa số đếm đáp án PDF duy nhất từ 511 thành 510 (một khóa rỗng từng được `defaultdict` tạo ra khi tìm câu 157).
- `js/core.js`, `js/app.js`: cho riêng câu 88 chương 2 có ba lựa chọn; xáo ABC, chấm điểm/lưu/khôi phục đúng, không nhận D. Thông báo 511 câu khả dụng và ghi đúng nguồn đính chính khi hiển thị đáp án.
- Cập nhật báo cáo dữ liệu, README, kiểm thử liên quan và PROGRESS; không xây dựng lại website.

## Kết quả kiểm tra

- Quét 511 câu đã lưu: toàn bộ câu hỏi/lựa chọn ở NFC; không có dấu kết hợp còn rời, chuỗi “Triế t”, khoảng trắng kép, NBSP hoặc các ký tự khoảng trắng vô hình được kiểm tra.
- Kiểm tra DOM thực tế chương 1 câu 15, chương 2 câu 1, chương 3 câu 16: đúng NFC, ranh giới từ giữ nguyên; tiếng Việt hiển thị đúng. Không sửa lỗi chính tả vốn có trong PDF.
- Xem ảnh tiêu đề sau sửa ở desktop và mobile 390 px: chữ “Triết” liền mạch; font tính toán là `"Times New Roman", serif`, letter-spacing bình thường, word-spacing 0 px.
- Trình duyệt: chương 2 câu 88 có ba nút A/B/C, chọn C báo đúng; chương 3 câu 157 và 167 chọn B báo đúng; chương 1 câu 62 giữ nguyên hai lựa chọn trùng; không ghi nhận lỗi console.
- Node: **12/12 kiểm thử đạt**, gồm xáo ba lựa chọn, chấm đúng, từ chối D, lưu/khôi phục và các chức năng quiz trước đó.
- Python: **3/3 kiểm thử đạt**: đính chính chỉ đổi đúng đáp án được xác nhận, không sửa lựa chọn/nội dung hoặc bảng nguồn; gắn đúng PDF; chuẩn hóa NFC không nối các từ tiếng Việt tùy tiện.
- `--apply-corrections`: mã thoát **0**, **511 câu dùng được**. `fourOptions=false` vẫn được công bố trung thực; `approvedOptionSets=true` theo ngoại lệ ba lựa chọn đã xác nhận.
- Không trích xuất lại toàn bộ PDF. Lần kiểm tra này chỉ dùng JSON đã có, mẫu văn bản lưu trước đó và các file font liên quan.

Ảnh sau sửa: [tiêu đề desktop](vietnamese-header-after.png).
