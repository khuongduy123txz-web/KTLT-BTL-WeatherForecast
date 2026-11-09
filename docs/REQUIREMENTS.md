# Đối chiếu đề tài 2

Nguồn: trang 2 của đề AC2010 project 20261. Các dòng dưới là phạm vi triển khai,
không phải cam kết điểm số do giảng viên chấm.

| Yêu cầu | File và cách kiểm chứng |
| --- | --- |
| Tìm thành phố | `api.js:searchCities`, kết quả có quốc gia và vùng để chọn |
| Browser Geolocation API | `api.js:detectLocation`, nút định vị có xử lý lỗi/quyền |
| Nhiệt độ, icon/description, humidity, wind, pressure, AQI | `view.js:renderBundle`, tất cả có trường riêng và đơn vị |
| 5 hoặc 7 ngày, cuộn/vuốt | `view.js:renderForecast` + `.forecast-rail`, mặc định yêu cầu API 7 ngày |
| Theme thời tiết | `model.js:weatherAppearance`, `view.js` toggle 5 class, gradient trong CSS |
| Biểu đồ nhiệt độ và độ ẩm 24 giờ | `charts.js:renderChart`, hai trục, tooltip, 3 chế độ, bảng bổ sung |
| fetch + async/await | `api.js:fetchJSON`, `fetchDashboard`, `searchCities` |
| Promise.all weather + AQI | `api.js:fetchDashboard`, kiểm thử chứng minh hai request khởi chạy trước khi resolve |
| Parse JSON phức tạp | `model.js:normalizeWeather/normalizeAir`, xử lý các mảng theo thời gian |
| Invalid city, 429, network | `api.js`, `script.js`, thông báo lỗi và retry |
| Chart.js | `vendor/chart.umd.js` 4.4.8, không cần CDN khi chạy |
| Tách module API / DOM / Chart | `js/api.js`, `js/view.js`, `js/charts.js`, được điều phối bởi `script.js` |

| Tiêu chí | Trọng số gốc | Minh chứng chính |
| --- | --- | --- |
| API Integration & Async Handling | 35% | api.js + model.js + api.test.js |
| Data Visualization & Charts | 20% | charts.js + bảng 24 giờ + kiểm tra browser |
| Error & Edge Case Handling | 15% | api.js + storage.js + script.js + tests/ |
| Dynamic UI & Responsive Design | 15% | style.css + class theme + tests/browser.html |
| Code Structure & Architecture | 15% | 6 module JS + README + comments + kiểm thử |

Các tình huống hiếm dùng dữ liệu giả lập có nhãn; không được gọi chúng là kiểm thử
trực tiếp với nhà cung cấp hoặc cảm biến thật.
