# Báo cáo dữ liệu PDF

Nguồn: `511 câu hỏi trắc nghiệm triết học.pdf` — 113 trang.
SHA-256: `c72a6b2b09149998b9cb8a4befd2ca05bc25921fdb557cbb44b2f03110c6e7c9`

Trích xuất **511 câu**; có **511 câu đủ dữ liệu để chấm điểm**.
**Kiểm tra theo PDF và đính chính được xác nhận: ĐẠT.**

| Chương | Số câu | Trang bảng đáp án |
|---|---:|---|
| 1 | 168 | 37, 38 |
| 2 | 155 | 70, 71 |
| 3 | 188 | 112, 113 |

## Kết quả tự động

- total511: ĐẠT
- uniqueIds: ĐẠT
- fourOptions: KHÔNG ĐẠT
- validAnswers: ĐẠT
- chapterTablesAgree: ĐẠT
- approvedOptionSets: ĐẠT
- answersMatchSourceOrCorrection: ĐẠT

`fourOptions = false` là thông tin đúng: chương 2 câu 88 có ba lựa chọn, đã được người dùng xác nhận; kiểm tra cấu trúc được chấp nhận là `approvedOptionSets`.

## Đối chiếu và đính chính

| Mức | Câu | Trang PDF | Chi tiết |
|---|---|---|---|
| info | chuong1-cau86 | 19 | Nhãn câu không có dấu ':' hoặc '.'; nhận diện theo số câu, giữ nguyên nội dung. |
| info | chuong2-cau88 | 55 | Câu này chỉ có ba lựa chọn A/B/C; không có và không thêm D. |
| info | chuong3-cau157 | 104 | Bổ sung B theo đính chính của người dùng; bảng PDF không ghi nhãn 157. |
| info | chuong3-cau167 | 106 | Người dùng xác nhận B; giữ nguyên hai dòng mang nhãn 167 trong bằng chứng PDF. |
| info | chuong1-cau62 | 14 | Giữ nguyên A/B trùng nội dung theo xác nhận của người dùng. |

## Cách xử lý

- `questions.json` lưu đủ 511 câu theo thứ tự. Chương 2 câu 88 chỉ có A/B/C, đúng là C. Không thêm lựa chọn D.
- Chương 3 câu 157 được bổ sung B theo xác nhận trực tiếp của người dùng; câu 167 giữ B. Không sửa hay đổi nhãn các dòng bảng PDF.
- Chương 1 câu 62 giữ nguyên A/B trùng nội dung; người dùng đã xác nhận điều này không ảnh hưởng.
- `data/corrections.json` lưu nguồn, SHA-256 và nội dung đính chính; `source-map.json` giữ riêng bằng chứng PDF gốc và xác nhận người dùng. PDF riêng lẻ vẫn có ngoại lệ, không được tuyên bố đủ bốn lựa chọn cho mọi câu.
- Bảng được đọc độc lập bằng văn bản và tọa độ ô; hai kết quả phải khớp. `source-map.json` lưu trang của từng câu và từng dòng đáp án.
- Chỉ nối dòng, chuẩn hóa khoảng trắng và Unicode NFC. Giữ nguyên lỗi chính tả, câu trùng và nội dung nguồn; không thêm giải thích.
- Khi xáo trộn, ứng dụng giữ thứ tự lựa chọn nếu câu có tham chiếu chữ A/B/C/D hoặc vị trí ‘trên/dưới’, nhằm bảo toàn ý nghĩa.
- Đã xem ảnh các bảng đáp án và trang 19, 55 để xác minh nhãn câu 86, lựa chọn D bị thiếu và nhãn 167 bị lặp. Báo cáo không khẳng định đã thẩm định kiến thức của tài liệu.
- Lần cập nhật đính chính sử dụng dữ liệu và bằng chứng đã lưu; không đọc/trích xuất lại toàn bộ PDF.
