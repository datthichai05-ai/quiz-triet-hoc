# PROGRESS — Quiz Triết học Mác – Lênin

> Tệp theo dõi tiến độ ngắn gọn cho Codex. **Không phải yêu cầu làm tất cả các việc ở đây.** Chỉ xử lý nhiệm vụ người dùng giao trong phiên hiện tại.

## 0. ĐỌC NHANH (nguồn trạng thái ưu tiên)

- **Mục tiêu:** Website quiz HTML/CSS/JavaScript thuần, dữ liệu từ PDF 511 câu, triển khai GitHub Pages.
- **Nhiệm vụ vừa hoàn thành:** Sửa tiếng Việt bị hở chữ ở tiêu đề và áp dụng đính chính người dùng ngày 21/10/2026.
- **Nguyên nhân:** Georgia thiếu glyph tiếng Việt; đã dùng Times New Roman và bỏ giãn chữ âm cho tiêu đề. JSON/DOM đúng NFC, không bị chèn khoảng trắng.
- **Dữ liệu hiện tại:** Đủ 511 câu dùng được; C2 câu 88 có ABC/C; C3 câu 157 và 167 là B; C1 câu 62 giữ A/B trùng. Xác nhận lưu trong data/corrections.json.
- **Kiểm tra:** 12/12 test Node, 3/3 test Python; mẫu cả 3 chương và tiêu đề desktop/mobile đạt. --apply-corrections mã 0, không trích xuất lại PDF.
- **Báo cáo:** reports/vietnamese-fix.md; chưa xuất bản lên GitHub. Chỉ tiếp tục theo yêu cầu mới.

## 1. Quy tắc tránh đọc lại, tránh tốn token

1. **Ưu tiên yêu cầu hiện tại.** Khi bắt đầu phiên, đọc phần `0. ĐỌC NHANH` và `1. Quy tắc` trước. Chỉ đọc các mục khác nếu liên quan trực tiếp tới task đang làm.
2. **Không tự làm task tiếp theo** chỉ vì có checkbox chưa hoàn thành. Checkbox là bảng theo dõi, không phải lệnh.
3. **Không đọc lại PDF 113 trang, `questions.json`, hoặc toàn bộ code** nếu task không liên quan đến nội dung đó. Trước tiên dùng tìm kiếm theo tên file/hàm/từ khóa; chỉ đọc đoạn cần thiết.
4. **Tái sử dụng dữ liệu đã trích xuất và kiểm chứng.** Nếu `questions.json` đã tồn tại và qua kiểm tra, không trích xuất PDF lại khi sửa UI. Chỉ đọc PDF khi sửa lỗi trích xuất, so đáp án, hoặc được yêu cầu.
5. **Không quét toàn repo** khi chỉ sửa một thành phần. Xem `git status`, `git diff` và những file có liên quan; không lặp lại các lượt kiểm tra không cần thiết.
6. **Không chạy lại mọi test** nếu thay đổi chỉ ảnh hưởng một phần và đã có test riêng. Trước khi bàn giao hoặc thay đổi dữ liệu nền, chạy kiểm tra đầy đủ thích hợp.
7. **Không tự cài thư viện, chuyển framework, thiết kế lại kiến trúc, thêm tính năng** ngoài phạm vi yêu cầu nếu không cần để hoàn thành task.
8. **Không coi nhật ký là bằng chứng hoàn thành.** Nếu file/code thực tế mâu thuẫn với PROGRESS, ưu tiên trạng thái thực tế và sửa lại PROGRESS.
9. Kết thúc task: cập nhật tối đa **3–6 dòng** trong phần `0`, đánh dấu mục liên quan và ghi một dòng ở mục `4. Nhật ký gần nhất`. Tránh chép lại mô tả dài hoặc lịch sử hội thoại.
10. Giữ nhật ký tối đa **5 dòng gần nhất**; lịch sử cũ đã được Git lưu. Không cần đọc commit cũ trừ khi task yêu cầu.

## 2. Danh sách công việc (chỉ là trạng thái)

- [x] **DATA:** Trích xuất câu hỏi/đáp án PDF sang `questions.json`, có ID duy nhất theo chương + số câu.
- [x] **VALIDATE:** Đạt theo PDF + đính chính người dùng: 511 ID đúng; riêng C2 câu 88 có ABC; C3 câu 157 bổ sung B. Không thêm D hoặc sửa nội dung trùng.
- [x] **UI:** Tạo trang chủ và giao diện câu hỏi responsive.
- [x] **PRACTICE:** Chế độ luyện tập, phản hồi đúng/sai, điều hướng câu hỏi.
- [x] **EXAM:** Chế độ thi thử, nộp bài và trang kết quả.
- [x] **REVIEW:** Ôn lại câu sai, đánh dấu câu hỏi.
- [x] **SAVE:** Lưu tiến độ cục bộ bằng `localStorage`.
- [x] **TEST:** Kiểm thử dữ liệu và các chức năng chính.
- [x] **DEPLOY:** Viết README và cấu hình GitHub Pages.

Đánh dấu `[x]` **chỉ sau khi đã kiểm tra kết quả thực tế**. Không đánh dấu dựa trên dự định hoặc mã chưa chạy.

## 3. Bản đồ file — chọn đọc theo task

| Loại task | Ưu tiên kiểm tra | Tránh đọc nếu không liên quan |
|---|---|---|
| Trích xuất PDF | `scripts/extract_pdf.py`, PDF, `questions.json` | CSS/giao diện |
| Kiểm tra đáp án | `questions.json`, script validation, đoạn PDF tương ứng | Toàn bộ UI |
| Sửa giao diện | `index.html`, `style.css`, JS liên quan | PDF gốc |
| Sửa logic quiz | `js/core.js`, `js/app.js`, `tests/core.test.js` | Toàn bộ PDF |
| Sửa lưu tiến độ | `js/storage.js`, `js/app.js`, test liên quan | PDF gốc |
| Triển khai | `index.html`, đường dẫn tài nguyên, `README.md`, cấu hình Pages | Toàn bộ nội dung 511 câu |

Cấu trúc hiện tại đã được ghi trong README.md; không tạo file trùng chỉ để khớp bảng.

## 4. Nhật ký gần nhất (tối đa 5 dòng)

- 2026-10-21 | VI FONT + CORRECTIONS | Sửa CSS font/giãn chữ; 511 câu dùng được theo đính chính | 12 Node + 3 Python đạt; kiểm tra browser 3 chương | Không đọc lại PDF.

- 2026-10-21 | WEBSITE + DATA | Đã tạo ứng dụng, 511 câu nguồn, script/audit, README | 11/11 test, browser/reload/timer/path con đạt | Còn 2 câu thiếu dữ liệu nguồn; chưa xuất bản GitHub.

## 5. Mẫu cập nhật khi kết thúc một task

Cập nhật mục `0` và thêm **một dòng ngắn** tại mục `4` theo mẫu:

`YYYY-MM-DD | TASK | Đã sửa: <file> | Kiểm tra: <lệnh/kết quả> | Còn lại: <nếu có>`

Nếu task chưa xong, ghi rõ `ĐANG LÀM` và blocker. Không tự bắt đầu task khác.
