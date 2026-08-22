# Từ điển Mông – Việt 4.1

## Có gì mới?
- Tra cứu Mông → Việt và Việt → Mông.
- **Khu vực chủ sở hữu:** thêm từ vào dữ liệu trên thiết bị, xuất toàn bộ dữ liệu JSON.
- **Đóng góp từ mới:** tạo phiếu đề xuất gồm tiếng Mông, nghĩa Việt, âm đầu, vần, thanh, ví dụ, ghi chú và người đóng góp.
- Phiếu đóng góp được tải thành file JSON để gửi cho chủ sở hữu kiểm tra và duyệt.
- Dữ liệu gốc lấy từ sheet **Từ điển sạch** của file Excel mới nhất và được loại trùng theo cặp tiếng Mông + nghĩa Việt.

## Quan trọng về quyền và lưu dữ liệu
Đây vẫn là website tĩnh (GitHub Pages). Chức năng "Chủ sở hữu" và "Đóng góp" ở bản này lưu dữ liệu bằng trình duyệt của từng thiết bị; chưa phải hệ thống tài khoản/cơ sở dữ liệu trực tuyến. Vì vậy người đóng góp chưa thể gửi trực tiếp vào kho dữ liệu của chủ sở hữu.

Để có bản 4.x hoàn chỉnh, có thể kết nối Google Sheets/Apps Script hoặc một cơ sở dữ liệu có đăng nhập. Khi đó người dùng gửi đề xuất trực tuyến, chủ sở hữu duyệt, và từ được duyệt mới xuất hiện cho tất cả người dùng.


## Ghi âm phát âm
Phiên bản 4.1 dùng `MediaRecorder` của trình duyệt để ghi âm từ micro. Người dùng có thể ghi, nghe lại, xóa và gửi kèm bản ghi trong phiếu đóng góp. Website phải chạy trên HTTPS (GitHub Pages đáp ứng điều kiện này) và người dùng phải cấp quyền micro.

## Đóng góp trực tuyến
Trong `app.js`, đặt URL Web App Google Apps Script vào `CONTRIBUTION_ENDPOINT`. Nếu để trống, website vẫn hoạt động và xuất phiếu JSON để gửi thủ công. Khi có endpoint, website POST dữ liệu đóng góp (kèm âm thanh dạng Data URL) tới máy chủ.
