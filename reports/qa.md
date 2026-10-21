# Biên bản kiểm thử ban đầu — 21/10/2026

> Bản ghi bên dưới thuộc phiên bản trước đính chính, giữ lại làm lịch sử. Hiện tại đủ 511 câu dùng được; kết quả mới và sửa font xem [vietnamese-fix.md](vietnamese-fix.md).

## Dữ liệu

- Trích xuất đủ **511 câu / 113 trang**, theo chương **168 / 155 / 188**, ID không trùng.
- **74 câu trải qua nhiều trang** được ghép bằng trạng thái câu/lựa chọn; số trang từng câu lưu ở `source-map.json`.
- Các bảng trang **37–38, 70–71, 112–113** được đọc theo văn bản và ô bảng độc lập; kết quả khớp.
- Đã xem ảnh sáu trang bảng đáp án và các trang **14, 19, 55** có điểm bất thường cần đối chiếu.
- `python scripts/extract_pdf.py --check`: nội dung JSON lưu khớp lần trích xuất mới. Mã thoát **1**, đúng theo thiết kế vì lỗi nguồn còn tồn tại.
- **Không đạt kiểm tra nghiêm ngặt toàn bộ 511 câu:** chương 2 câu 88 thiếu D; chương 3 câu 157 thiếu đáp án. Website chỉ đưa **509 câu** đủ dữ liệu vào bài chấm điểm. Cảnh báo phụ: chương 1 câu 62 có A/B trùng; chương 3 ghi nhãn 167 hai lần cùng B. Xem `data-validation.md`.

## Kiểm thử tự động

`node --test tests/core.test.js`: **11/11 đạt**, không bỏ qua bài kiểm thử.

Đã kiểm tra số câu/chương/ID, Unicode NFC, đáp án theo bằng chứng nguồn, 10/20/50/100/tất cả, lọc chương/câu sai/dấu sao, xáo trộn không mất câu, bảo toàn đáp án đúng sau đổi thứ tự, khóa luyện tập/đổi lựa chọn thi thử, chấm đúng/sai/trống, ôn sai nhiều lần, lưu/khôi phục toàn bộ trạng thái, thời hạn sau tải lại, dữ liệu lưu hỏng và lỗi localStorage.

`node --check` cho JavaScript ứng dụng và lưu trữ: đạt.

## Kiểm thử trực tiếp trên trình duyệt Chromium

| Tình huống | Kết quả quan sát |
|---|---|
| Bài luyện 10 câu, tắt xáo câu | Câu 1 của chương 1 mở đúng nội dung |
| Chọn sai, đánh dấu rồi tải lại | Hiện đáp án đúng; cả 4 lựa chọn khóa; lựa chọn, vị trí và dấu sao được khôi phục |
| Chuyển câu bằng bảng / trước / tiếp | Nội dung thay đúng câu; câu chưa làm vẫn chọn được |
| Phím số và mũi tên | Chọn đáp án bằng `3`, chuyển câu bằng `ArrowRight` hoạt động |
| Nộp luyện tập | Dialog báo 8 câu trống; kết quả 1 đúng, 1 sai, 8 trống, 10% |
| Xem lại và lọc câu sai | Hiện lựa chọn đã chọn/đúng; bảng lọc còn đúng 1 câu sai |
| Luyện lại câu sai | Trả lời đúng câu đã sai; danh sách sai giảm 1 → 0 khi tùy chọn bật |
| Thi thử, đổi A → D | Lựa chọn thay được; không có màu/nhãn đúng-sai hoặc phản hồi đáp án |
| Tải lại thi thử có hẹn giờ | Lựa chọn và thời hạn được giữ, không đặt lại thời gian |
| Hết thời hạn 1 phút | Tự nộp; hiện 2 đúng, 0 sai, 8 trống, 20%, thời gian 01:00 |
| Lịch sử | Lưu cả bài luyện tập, bài luyện sai và thi thử; có thể mở lại bài |
| Tắt đồng hồ, chọn toàn bộ chương 3 | 187 câu khả dụng; không có đồng hồ; bắt đầu chương 3 câu 1 |
| Đường dẫn repository con | Tải và làm bài tại `/tmp/gh-pages/quiz-triet-hoc/`, tài nguyên và JSON truy cập đúng |
| Màn hình 1280 px và 390 px | Đã xem bố cục desktop và điện thoại; lựa chọn dài xuống dòng, không tràn ngang |
| Màn hình 320 px | Đã kiểm tra kích thước DOM: không tràn ngang |
| Console trong các luồng trên | Không ghi nhận lỗi/cảnh báo JavaScript |

Ảnh giao diện: `desktop-preview.png`, `mobile-preview.png`.

## Giới hạn xác minh

- Chưa có URL công khai trên GitHub: dự án chưa được đẩy đến tài khoản/repository của người dùng. README có đầy đủ bước xuất bản. Kiểm thử đường dẫn con dùng máy chủ cục bộ.
- Chưa chạy trên thiết bị iOS/Safari hoặc Android thực; kích thước mobile được mô phỏng bằng viewport Chromium.
- Chưa thể khẳng định 511 câu hợp lệ khi PDF còn thiếu dữ liệu. Không suy đoán, thêm lựa chọn giả hoặc tự sửa đáp án bằng kiến thức bên ngoài.
