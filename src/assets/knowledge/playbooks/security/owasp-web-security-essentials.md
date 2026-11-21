## 1. Core Concept

Phần lớn sự cố bảo mật web đến từ **một số lớp lỗi lặp lại**, được **OWASP Top 10** tổng hợp: broken access control, lỗi mật mã, **injection**, thiết kế không an toàn, cấu hình sai, thành phần lỗi thời, lỗi xác thực… Nguyên tắc nền: **không bao giờ tin đầu vào**, **kiểm tra quyền ở server**, và **phòng thủ nhiều lớp (defense in depth)**. Mental model: *mọi dữ liệu từ ngoài là "mã độc tiềm tàng" cho đến khi được xác thực, mã hoá đúng ngữ cảnh và đối chiếu với quyền của người gọi.*

## 2. How It Works

- **Injection (SQLi, command, NoSQL)**: dữ liệu người dùng bị hiểu như **lệnh**. Phòng: **parameterized query/prepared statement**, ORM đúng cách, tuyệt đối không nối chuỗi; kiểm tra allowlist cho tên cột/bảng động.
- **XSS**: kẻ tấn công chèn JavaScript vào trang. Phòng: **output encoding theo ngữ cảnh** (HTML, attribute, JS, URL), framework tự escape, **Content-Security-Policy**, cờ `HttpOnly`.
- **CSRF**: trình duyệt tự gửi cookie trong request giả mạo. Phòng: **`SameSite` cookie**, **CSRF token**, kiểm tra `Origin`; API dùng Bearer token trong header ít bị CSRF hơn.
- **SSRF**: server bị lừa gọi URL do kẻ tấn công chọn (đặc biệt tới **metadata endpoint `169.254.169.254`** của cloud). Phòng: **allowlist** đích, chặn IP nội bộ, dùng IMDSv2, tách mạng.
- **Broken access control / IDOR**: thiếu kiểm tra quyền **trên từng đối tượng**; deny by default, kiểm tra ở tầng nghiệp vụ.
- **Cryptographic failures**: dữ liệu nhạy cảm không mã hoá, thuật toán yếu, khoá lộ.
- **Security misconfiguration & thành phần lỗi thời**: cổng/bucket mở, mật khẩu mặc định, thư viện có CVE → **SCA/dependency scanning**, vá định kỳ.
- **Insecure deserialization, path traversal, file upload**: kiểm tra kiểu/kích thước, không thực thi, lưu ngoài web root.

```sql
-- SAI: nối chuỗi -> SQL injection
"SELECT * FROM users WHERE email = '" + email + "'"
-- ĐÚNG: tham số hoá, DB tách dữ liệu khỏi lệnh
SELECT * FROM users WHERE email = $1
```

## 3. Visual Diagram

_No diagram needed._

## 4. Rules of Thumb & Trade-offs

- **Validate đầu vào ở biên** (allowlist, kiểu, độ dài) **và encode đầu ra** theo ngữ cảnh — hai việc khác nhau, cần cả hai.
- **Deny by default**, **least privilege** cho tài khoản DB, service, IAM.
- Dùng **framework/thư viện chuẩn** cho auth, session, crypto; đừng tự viết.
- Trade-off: **bảo mật** vs **tiện dụng/hiệu năng** (CSP chặt phá script inline cũ, rate limit làm khó người dùng thật) — quyết định theo mô hình đe doạ.

## 5. Must Remember / Production Pitfalls

- **Kiểm tra quyền chỉ ở UI/route** mà thiếu ở tầng dữ liệu → IDOR; không tin ID từ client.
- **CORS `*` kèm credentials** hoặc phản chiếu `Origin` tuỳ ý mở toang API.
- **Secret trong repo/log** và **dependency không cập nhật** là nguồn sự cố thực tế hàng đầu.
- Code do AI sinh thường **nối chuỗi SQL** hoặc bỏ qua kiểm tra quyền: luôn rà soát điểm này.
- Interview trap: "Prepared statement chống được mọi SQL injection?" → chống phần **giá trị**; **tên bảng/cột/ORDER BY động** vẫn cần allowlist.

## 6. Search Hooks

- `OWASP Top 10` — danh sách rủi ro bảo mật ứng dụng web hàng đầu.
- `SQL injection parameterized queries` — tách dữ liệu khỏi lệnh SQL.
- `XSS output encoding Content-Security-Policy` — chống chèn script vào trang.
- `SSRF cloud metadata IMDSv2` — server bị lừa gọi tới tài nguyên nội bộ.
- `CSRF SameSite cookies` — chống giả mạo request qua cookie.
- `defense in depth least privilege` — phòng thủ nhiều lớp và quyền tối thiểu.
