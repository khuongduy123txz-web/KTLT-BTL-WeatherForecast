# Weather & Air

Bài tập lớn đề tài 2 — **Real-Time Weather & Air Quality Dashboard**.
HTML, CSS và JavaScript ES Modules thuần; Chart.js 4.4.8 đã được lưu trong `vendor/`.
Không cần npm install, tài khoản API, API key hay cơ sở dữ liệu.

## Chạy trên Windows

1. Giải nén toàn bộ ZIP, mở thư mục `weather-air-dashboard`.
2. Mở CMD tại thư mục đó. Chạy một trong hai cách:

```bat
node server.mjs
```

Hoặc nếu đã có Python:

```bat
py -m http.server 8080 --bind 127.0.0.1
```

3. Mở **http://localhost:8080** bằng Chrome, Edge hoặc Firefox.
4. Dừng máy chủ bằng **Ctrl+C**. Lần sau chạy lại cùng lệnh.

Với XAMPP có thể đặt thư mục trong `C:\xampp\htdocs\weather-air-dashboard`, bật Apache,
rồi mở `http://localhost/weather-air-dashboard/`.

**Không mở `index.html` bằng cách nhấp đúp:** ES Modules cần HTTP/HTTPS.
Định vị cần HTTPS hoặc localhost và sự đồng ý của người dùng. Bật dịch vụ vị trí
trên thiết bị nếu cần. Tìm thành phố luôn là lựa chọn thay thế.

## Deploy lên Render

Tạo **Web Service**, kết nối repo GitHub và chọn nhánh `main`:

- **Build Command:** `npm install`
- **Start Command:** `npm start`

Máy chủ dùng cổng từ biến `PORT` và lắng nghe trên `0.0.0.0` khi Render tự đặt
`RENDER=true`. Khi chạy trên máy cá nhân, máy chủ chỉ lắng nghe trên `127.0.0.1`.
Sau khi đẩy thay đổi lên GitHub, chọn **Manual Deploy → Deploy latest commit**
nếu dịch vụ chưa tự deploy.

## Sử dụng

- Nhập tên thành phố, bấm **Tìm thành phố**, rồi chọn đúng địa điểm/quốc gia.
- Bấm **Dùng vị trí của tôi** để lấy tọa độ qua Geolocation API.
- Xem nhiệt độ, cảm giác như, độ ẩm, gió, áp suất mặt đất, US AQI, PM2.5 và PM10.
- Chuyển °C/°F; đơn vị được đổi đồng bộ ở thời tiết, forecast, biểu đồ và bảng.
- Chọn **Cả hai / Nhiệt độ / Độ ẩm**; chạm/di chuột lên biểu đồ để xem từng giờ.
- Mở **Xem bảng số liệu 24 giờ** để đọc số liệu bằng bàn phím hoặc trình đọc màn hình.
- Vuốt ngang, dùng thanh cuộn hoặc hai nút mũi tên để xem 7 ngày dự báo.
- **Làm mới dữ liệu** tải lại thủ công; trang tự tải lại mỗi 10 phút khi đang hiển thị.

## Dữ liệu và kiến trúc

| File | Trách nhiệm |
| --- | --- |
| `index.html` | HTML ngữ nghĩa, nhãn, các vùng dữ liệu và trạng thái |
| `style.css` | Bố cục responsive, focus, giảm chuyển động, 5 theme |
| `script.js` | Điều phối trạng thái, sự kiện, hủy yêu cầu cũ, cache và timer |
| `js/config.js` | Endpoint, timeout và địa điểm mặc định |
| `js/api.js` | fetch, async/await, Promise.all, geocoding, weather, AQI, định vị |
| `js/model.js` | Chuẩn hóa JSON, WMO, AQI, múi giờ và chuyển đơn vị |
| `js/view.js` | Cập nhật DOM bằng textContent/createElement |
| `js/charts.js` | Chart.js, hai trục, tooltip và cập nhật một instance |
| `js/storage.js` | Cache dữ liệu gần nhất, kiểm tra dữ liệu lưu và đơn vị |
| `server.mjs` | Máy chủ localhost tùy chọn, dùng thư viện chuẩn Node |
| `tests/` | Kiểm thử logic và trang giả lập lỗi để kiểm tra giao diện |
| `vendor/` | Chart.js 4.4.8 và giấy phép MIT |
| `assets/` | SVG nội bộ, font Be Vietnam Pro và giấy phép OFL |

Luồng chính: tên thành phố → geocoding → tọa độ → weather + AQI đồng thời
→ chuẩn hóa JSON → cập nhật DOM, theme và biểu đồ.
Định vị cung cấp tọa độ trực tiếp, không cần geocoding theo tên.

Thời gian dùng Unix seconds + IANA timezone từ API; không ghép chuỗi ngày giờ
rồi mặc định múi giờ thiết bị. Forecast giờ là **24 mốc tiếp theo**, kể từ giờ
tròn đầu tiên không sớm hơn thời điểm dữ liệu hiện tại. Ngày dự báo gồm hôm nay.

## Xử lý lỗi

| Tình huống | Hành vi |
| --- | --- |
| Tên trống/ngắn hoặc không có thành phố | Hiện lỗi dưới ô tìm kiếm, giữ dữ liệu đang xem |
| Người dùng từ chối định vị | Giải thích cách cấp quyền hoặc tìm theo tên |
| HTTP 429 | Đọc Retry-After, chặn gọi tiếp trong thời gian chờ |
| HTTP 401/403/5xx, JSON lỗi, mất mạng hoặc quá 12 giây | Thông báo, nút thử lại, giữ dữ liệu trước đó |
| AQI lỗi nhưng thời tiết thành công | Hiển thị thời tiết và forecast, AQI đánh dấu thiếu |
| Một giá trị null | Hiển thị “—”, không coi null là 0; biểu đồ để khoảng trống |
| Đổi địa điểm liên tiếp | AbortController và requestId bảo vệ khỏi phản hồi cũ |
| localStorage hỏng, đầy hoặc bị chặn | Bỏ qua dữ liệu lỗi; ứng dụng vẫn hoạt động |
| Chart.js thiếu hoặc lỗi | Bảng 24 giờ vẫn đọc được, thông báo thay thế biểu đồ |

Cache chỉ giữ **bộ dữ liệu thành công gần nhất**, tối đa 24 giờ, gồm địa điểm/tọa độ
và thời điểm tải. Dữ liệu cũ luôn có nhãn “Bản đã lưu”; không gán dữ liệu cũ cho
thành phố mới khi tải thất bại. Có thể xóa dữ liệu trang trong cài đặt trình duyệt.
Không có Service Worker: xem lại khi mất mạng cần trang đã được mở hoặc đang được
phục vụ từ máy chủ cục bộ. Ứng dụng không cam kết khởi động từ máy chủ web từ xa
khi thiết bị hoàn toàn mất kết nối.

## Kiểm thử

Cần Node.js 20 trở lên (khuyến nghị bản LTS đang được hỗ trợ):

```bat
node --test
```

Hoặc `npm test`. Bộ kiểm thử không gọi API thật và không cài dependency.
Kết quả bàn giao: **27/27 kiểm thử đạt**. Chi tiết ở `docs/TEST_RESULTS.md`.

Sau khi chạy máy chủ, mở **http://localhost:8080/tests/browser.html** để kiểm tra
responsive và các tình huống lỗi bằng dữ liệu giả lập. Trang này có nhãn riêng,
cache riêng trong bộ nhớ và không được ứng dụng chính nhập vào. Chọn kịch bản,
chiều rộng, bấm **Chạy kịch bản**, chờ dữ liệu rồi **Kiểm tra bố cục**.

## Giới hạn và nguồn

“Real-time” ở đây là tải dữ liệu mô hình mới nhất nhà cung cấp trả về; không phải
luồng đo trực tiếp từng giây. Thời tiết và AQI có thể có giờ dữ liệu khác nhau.
US AQI không phải VN AQI; giao diện ghi rõ hệ chỉ số và giờ dữ liệu không khí.
Định vị hiển thị “Vị trí của bạn”, không suy đoán tên thành phố qua reverse geocoding.
API miễn phí dành cho sử dụng phi thương mại theo điều khoản hiện hành của nhà cung cấp.
Khi chuyển sang API thương mại có secret, cần backend/proxy giữ secret; không ghi
secret vào JavaScript phía trình duyệt hoặc URL công khai.

- [Weather API](https://open-meteo.com/en/docs)
- [Air Quality API và quy đổi US AQI](https://open-meteo.com/en/docs/air-quality-api)
- [Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- [Open-Meteo terms](https://open-meteo.com/en/terms)
- [CAMS](https://atmosphere.copernicus.eu/)
- [GeoNames](https://www.geonames.org/)
- [Chart.js](https://www.chartjs.org/docs/latest/)
- [Be Vietnam Pro](https://github.com/google/fonts/tree/main/ofl/bevietnampro)

Giấy phép thư viện giữ tại `vendor/Chart.js-LICENSE.md`; font tại `assets/fonts/OFL.txt`.
