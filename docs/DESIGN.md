# Thiết kế bảng điều khiển

Software / ứng dụng dữ liệu. Hành động chính là tìm thành phố.
Palette cool-grey-cobalt: nền xám sáng, chữ xanh đậm, nút cobalt giúp tách thao tác
khỏi các màu biểu diễn nhiệt độ, độ ẩm và mức AQI. Font Be Vietnam Pro thay cho
Outfit vì kiểm tra glyph cho thấy Outfit thiếu một số ký tự tiếng Việt.

Giao diện là dashboard thật, không thêm landing page, bảng giá, đăng nhập, tài
khoản hay các section quảng cáo. Dữ liệu hiện tại, AQI, chỉ số, biểu đồ và forecast
theo cùng mép lề và cùng thang khoảng cách. Màu nền thời tiết thay đổi qua dữ liệu,
các phần đọc số liệu giữ nền trắng để bảo đảm khả năng đọc.

Hero dạng triptych và moment pinned-chapters đã được xem xét nhưng không dùng:
đề yêu cầu bảng điều khiển tương tác, native scrolling forecast và tìm kiếm trực
tiếp, không phải trang giới thiệu sản phẩm. Không áp dụng chiều cao section cố
định một màn hình vì nó tạo khoảng trống và làm khó xem dữ liệu trên điện thoại.
Chuyển động gồm entrance một lần và hover/press ngắn; tắt khi người dùng yêu cầu
reduced motion. Không cần ảnh minh họa bên ngoài hay shader.

Voice: nhãn tiếng Việt trực tiếp, tên dữ liệu và đơn vị rõ ràng; lỗi nói cách tiếp
tục thao tác. Không có số liệu mặc định giả, lời nhận xét thời tiết bịa đặt hoặc
nhận định y tế suy từ AQI.

GATE: ERROR — consistency.mjs và layout checker không chạy được vì môi trường
không có Chrome/Chromium cục bộ. Không xem đây là PASS. Cảnh báo copy-em-dash từ
dấu phân cách trong metadata được giữ vì nó chỉ phân tách tên ứng dụng và mô tả.
Đã kiểm tra chức năng và bố cục riêng trong trình duyệt cloud; chi tiết phạm vi
ở TEST_RESULTS.md. Không có waiver dùng để biến kiểm tra chưa chạy thành đạt.
