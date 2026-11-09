# Kết quả kiểm thử bàn giao

Ngày kiểm tra: **09/11/2026**. Các dữ liệu live có thể đổi theo thời gian.

## Kiểm thử tự động

Chạy `node --test` hoặc `npm test` tại thư mục dự án.
Kết quả: **27 test, 27 pass, 0 fail, 0 skipped**. Kết quả thô trong `test-output.txt`.

| File | Số ca | Phạm vi |
| --- | ---: | --- |
| model.test.js | 12 | Kiểu dữ liệu, null, °C/°F, tọa độ, ranh giới AQI, WMO, 24 mốc giờ, timezone/DST, giờ AQI |
| api.test.js | 12 | 429/Retry-After, 403, 503, JSON lỗi, network, timeout, abort, invalid city, gọi đồng thời, AQI lỗi riêng, geolocation giả lập |
| storage.test.js | 3 | Cache hợp lệ/hết hạn/hỏng; localStorage bị chặn |

Một kiểm thử HTTP bổ sung đã chạy máy chủ `server.mjs` bằng tiến trình con và
xác nhận 4 điều kiện: HTML trả 200; JavaScript đúng MIME; đường dẫn vượt thư mục
bị trả 403; đường dẫn ẩn bị trả 403. Tiến trình kiểm tra được dừng sau khi hoàn tất.

## Kiểm tra trình duyệt với API thật

- Hà Nội tải được weather, AQI, 7 ngày forecast và 24 giờ biểu đồ.
- Weather và Air Quality API trả JSON đúng cấu trúc dự kiến; normalize thành 24 mốc và 7 ngày.
- Đổi °C sang °F và quay lại °C: chỉ số hiện tại, cảm giác như, forecast và chú giải chart đồng bộ.
- Chuyển biểu đồ sang Độ ẩm rồi Cả hai: trạng thái nút đúng, đường biểu đồ xuất hiện.
- Tìm `zzzz-no-city-12345`: thông báo không tìm thấy, giữ dữ liệu Hà Nội.
- Biểu đồ đã được quan sát trực tiếp, có hai đường, hai đơn vị và trục giờ địa phương.

## Kiểm tra giả lập trong trình duyệt

Trang `tests/browser.html` có nhãn dữ liệu giả lập; không phải phép đo live.

| Kịch bản | Quan sát |
| --- | --- |
| Chiều rộng 1440 / 1024 / 768 / 390 / 320 px | Không tràn ngang toàn trang; có 7 thẻ forecast và 24 dòng bảng |
| Ban đêm | Class/theme night và nền tối trên thẻ thời tiết |
| Tuyết | Class/theme snowy, mô tả tuyết và icon tuyết |
| AQI trả HTTP 503 | Thời tiết và forecast vẫn có; AQI ghi Chưa có dữ liệu; có thông báo và retry |
| HTTP 429 và bấm retry trước hạn | Thông báo số giây phải chờ, không tải dồn dập |
| Offline không có cache | Thông báo ngoại tuyến và nút Thử lại; không bịa số liệu |
| Chọn TP. Hồ Chí Minh rồi chọn ngay Đà Nẵng | Yêu cầu chậm bị hủy; kết quả cuối là Đà Nẵng với 7 ngày / 24 giờ |

## Phạm vi chưa chứng nhận

- Tọa độ GPS thật, quyền vị trí và cài đặt dịch vụ vị trí trên từng máy của nhóm.
- Safari và các thiết bị cảm ứng vật lý; khả năng vuốt sử dụng native overflow của trình duyệt.
- Mọi tổ hợp API ngoài các trường và cấu trúc đã mô tả; tính sẵn sàng của nhà cung cấp trong tương lai.
- Bộ checker thiết kế cục bộ: **GATE: ERROR**, vì không có Chrome/Chromium cục bộ;
  không xem là PASS. Kiểm tra browser nói trên được thực hiện riêng trong trình duyệt cloud.

Các kiểm thử logic có sử dụng fetch và geolocation giả lập. Không được trình bày
những kết quả này thành kiểm chứng cảm biến thật hoặc thành cam kết điểm số.
