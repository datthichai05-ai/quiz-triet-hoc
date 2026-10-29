# Ôn tập Triết học Mác – Lênin

Website HTML5, CSS3 và JavaScript thuần để luyện tập, thi thử và ôn lại câu sai.

## Trạng thái dữ liệu — đọc trước

Đã có 511 câu, chương 1 có 168, chương 2 có 155, chương 3 có 188.

| Vị trí | Xác nhận và cách xử lý |
|---|---|
| Chương 2, câu 88; trang 55 | Chỉ có A/B/C, đúng là C. Đây là câu ba lựa chọn hợp lệ; không thêm D. |
| Chương 3, câu 157 | Đáp án B theo đính chính người dùng; không giả định có dòng đáp án này trong PDF. |
| Chương 3, câu 167 | Giữ B; bằng chứng nguồn vẫn giữ hai dòng 167 cùng B. |
| Chương 1, câu 62 | Giữ nguyên A/B trùng nội dung, đáp án C theo bảng. |
| Chương 1, câu 86; trang 19 | Nhãn không có dấu `:`; script nhận diện theo số câu, không đổi nội dung. |

[Đính chính](data/corrections.json) được lưu riêng, gắn SHA-256 của PDF. [Báo cáo](reports/data-validation.md) và [bằng chứng nguồn](reports/source-map.json) phân biệt dữ liệu PDF với phần người dùng xác nhận. Không sửa nội dung lựa chọn hoặc thêm giải thích đáp án. Kiểm tra `fourOptions` vẫn là false vì một câu có ba lựa chọn; kiểm tra đúng theo cấu trúc đã xác nhận là `approvedOptionSets`.

## 1. Chạy trên máy tính

Mở terminal trong thư mục dự án, chạy một trong các lệnh sau:

```powershell
# Windows đã cài Python
py -m http.server 8000 --bind 127.0.0.1
```

```sh
# macOS / Linux
python3 -m http.server 8000 --bind 127.0.0.1
```

Mở **http://127.0.0.1:8000/**. Dừng máy chủ bằng `Ctrl+C`. Không mở `index.html` trực tiếp qua `file://` vì trình duyệt chặn tải JSON/module. Không cần cài npm để sử dụng website. Nếu máy không nhận lệnh `py`, thử `python`.

## 2. Đẩy dự án lên GitHub

1. Đăng nhập GitHub, tạo repository **Public**, ví dụ `quiz-triet-hoc`. Để repository trống, không chọn tạo README sẵn nếu dùng các lệnh bên dưới.
2. Trong terminal tại thư mục dự án:

```sh
git init
git add .
git commit -m "Build philosophy quiz with audited PDF data"
git branch -M main
git remote add origin https://github.com/TEN-CUA-BAN/quiz-triet-hoc.git
git push -u origin main
```

Thay `TEN-CUA-BAN` và tên repository bằng giá trị của bạn. Nếu dự án đã có Git/remote thì dùng remote hiện tại, không chạy lại các lệnh khởi tạo. `.gitignore` loại tệp tạm, thư viện và môi trường Python. PDF gốc được giữ để tái trích xuất và đối chiếu.

## 3. Kích hoạt GitHub Pages

1. Mở repository → **Settings → Pages**.
2. Trong **Build and deployment**, chọn **Source: Deploy from a branch**.
3. Chọn nhánh **main**, thư mục **/(root)** → **Save**.
4. Đợi tác vụ xuất bản hoàn tất; xem tab **Actions** nếu có lỗi.

File `.nojekyll` đã có sẵn. Website tĩnh không cần workflow build riêng. GitHub Pages hỗ trợ repository công khai với gói GitHub Free. Tham khảo [hướng dẫn chính thức của GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 4. Lấy link công khai để chia sẻ

Quay lại **Settings → Pages**, lấy URL ở thông báo website đã xuất bản / **Visit site**. Với ví dụ trên, URL thường là:

```text
https://TEN-CUA-BAN.github.io/quiz-triet-hoc/
```

Mở link đó trong cửa sổ riêng tư hoặc điện thoại để xác nhận. Mỗi người có tiến độ riêng theo trình duyệt; kết quả không gửi lên máy chủ. Sau khi sửa tệp, `git add .`, `git commit`, `git push` để cập nhật website.

## Cách sử dụng

- **Luyện tập:** chọn câu, nhận đúng/sai ngay; lựa chọn đã trả lời bị khóa. Có thể trở lại câu trước, chuyển nhanh bằng bảng câu, đánh dấu sao và kết thúc bất kỳ lúc nào.
- **Thi thử:** có thể đổi đáp án, không hiện đúng/sai trước khi nộp. Có tùy chọn giới hạn 1–600 phút hoặc tắt đồng hồ. Hết giờ tự nộp; tải lại hoặc đóng trang không đặt lại thời gian. Nếu đóng trình duyệt khi hết giờ, bài được chấm ngay lần mở lại tiếp theo.
- **Kết quả:** số câu đúng/sai/bỏ trống và phần trăm trên tổng số câu. Xem từng câu cùng lựa chọn đã chọn và đáp án đúng, lọc câu sai/bỏ trống, làm lại hoặc luyện lại câu sai.
- **Ôn tập:** danh sách câu từng làm sai và danh sách dấu sao tách riêng. Bỏ trống không tự coi là câu trả lời sai. Bật tùy chọn xóa câu sai sau khi trả lời đúng nếu muốn; dấu sao chỉ bỏ khi bạn tự bỏ đánh dấu.
- **Xáo trộn:** Fisher–Yates cho thứ tự câu và lựa chọn; chấm theo khóa đáp án gốc. Những câu có tham chiếu chữ cái (ví dụ “Cả A, B, C”) hoặc vị trí (“các phương án trên”) được giữ thứ tự đáp án để bảo toàn ý nghĩa; giao diện có ghi chú.
- **Bàn phím:** `Tab` / `Shift+Tab` để chuyển phần tử, `Enter` / `Space` để kích hoạt, `1`–`4` để trả lời, `←` / `→` để chuyển câu. Có nhãn biểu mẫu, focus rõ, vùng thông báo cho trình đọc màn hình và lựa chọn giảm chuyển động.
- **Tiến độ:** bài hiện tại tự lưu sau mỗi thao tác; khi tải lại sẽ mở đúng câu, lựa chọn và thứ tự đã xáo. Chỉ có một bài đang làm; bắt đầu bài khác có hộp xác nhận thay thế. Lịch sử giữ 50 bài gần nhất.

`localStorage` tách theo origin và đường dẫn repository. Trình duyệt khác, chế độ riêng tư, thiết bị khác hoặc đổi đường dẫn sẽ có dữ liệu riêng. Xóa dữ liệu website sẽ xóa tiến độ. Nếu trình duyệt từ chối lưu hoặc hết dung lượng, website thông báo và vẫn cho tiếp tục làm trong phiên. Dùng một tab cho một bài để tránh hai tab ghi đè tiến độ cùng trình duyệt.

Đáp án không được hiện trong giao diện thi thử trước khi nộp. Do đây là website tĩnh có JSON công khai, người chủ động mở DevTools/tệp JSON vẫn có thể đọc đáp án; phù hợp tự ôn tập, không phải hệ thống thi bảo mật.

## Trích xuất lại và kiểm tra

Chỉ cần Python khi thay dữ liệu hoặc kiểm tra nguồn, không cần Python trên GitHub Pages:

```sh
python -m pip install -r requirements.txt
python scripts/extract_pdf.py
```

Script xử lý câu kéo dài qua nhiều dòng/trang, nhãn câu theo chương, cả dấu `:` / `.` và nhãn câu 86 không có dấu. Nội dung chỉ được chuẩn hóa Unicode NFC và khoảng trắng; không sửa lỗi chính tả. Bảng đáp án được đọc bằng văn bản và tọa độ ô, đối chiếu độc lập trước khi ghép theo `(chapter, number)`.

Đầu ra:

- `questions.json`: 511 bản ghi gốc, đúng thứ tự.
- `reports/data-validation.json` và `.md`: kiểm tra, lỗi và số câu có thể chấm.
- `reports/source-map.json`: trang chứa từng câu, từng dòng đáp án và SHA-256 nguồn.

Khi chỉ áp dụng đính chính đã được xác nhận, dùng dữ liệu và bằng chứng đang lưu, **không đọc lại PDF**:

```sh
python scripts/extract_pdf.py --apply-corrections
```

Chỉ khi cần đối chiếu lại nguồn PDF, so sánh JSON đang lưu với lần trích xuất mới cộng đính chính mà không ghi đè JSON:

```sh
python scripts/extract_pdf.py --check
```

Mã thoát: `0` = kiểm tra theo PDF cộng đính chính đã xác nhận đạt; `1` = còn lỗi chưa xử lý, báo cáo vẫn được xuất; `2` = lỗi đọc/chạy hoặc JSON không khớp nguồn và đính chính. Hiện tại áp dụng đính chính trả mã `0`. Không sửa logic nối khoảng trắng tiếng Việt: dữ liệu đã ở NFC; lỗi “Triế t” ở tiêu đề do Georgia thiếu glyph, đã sửa font CSS.

Kiểm thử ứng dụng và kiểm tra bản ghi đã trích xuất (Node.js 20+):

```sh
node --test tests/core.test.js
```

Các bài kiểm thử bao gồm số lượng, ID, chương, đối chiếu đáp án, giới hạn số câu, xáo trộn, chấm điểm, khóa/sửa đáp án, ôn sai, lưu/khôi phục, thời hạn và dữ liệu lưu bị hỏng. Bộ test kiểm tra riêng ngoại lệ ba lựa chọn, từ chối D, giữ A/B trùng và B của câu 157 có nguồn là đính chính, không phải một dòng PDF tự tạo.

Xem thêm [biên bản kiểm thử giao diện](reports/qa.md).

## Bản đồ mã nguồn

```text
index.html                  Khung HTML, điều hướng và dialog
style.css                   Giao diện desktop/mobile
assets/favicon.svg          Biểu tượng nội bộ, không gọi tài nguyên ngoài
js/app.js                   Giao diện, sự kiện, hẹn giờ, điều phối bài làm
js/core.js                  Chọn câu, xáo trộn, chấm điểm và xác thực bài lưu
js/storage.js               localStorage và khôi phục an toàn
questions.json             Dữ liệu từ PDF
scripts/extract_pdf.py      Trích xuất và đối chiếu nguồn
reports/                   Báo cáo dữ liệu, trang nguồn và QA
tests/core.test.js          Kiểm thử bằng Node, không cần thư viện ngoài
requirements.txt           Thư viện Python cho bước trích xuất
```
