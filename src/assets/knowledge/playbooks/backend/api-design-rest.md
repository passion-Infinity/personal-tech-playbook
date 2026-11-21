## 1. Core Concept

**API** là hợp đồng giữa các hệ thống; thiết kế tốt nghĩa là **dễ dùng đúng, khó dùng sai, và tiến hoá được mà không phá client**. **REST** mô hình hoá thế giới thành **resource** được thao tác qua ngữ nghĩa chuẩn của HTTP. Mental model: *API công khai là "lời hứa" — sau khi có client dùng, bạn không còn tự do đổi nó.*

## 2. How It Works

- **Resource & URL**: danh từ số nhiều (`/orders`, `/orders/42/items`), không để động từ trong URL.
- **Ngữ nghĩa method**: `GET` (an toàn, idempotent), `PUT` (thay thế, idempotent), `DELETE` (idempotent), `POST` (tạo/hành động, **không** idempotent), `PATCH` (sửa một phần).
- **Status code**: `200/201/204` thành công; `400` yêu cầu sai; `401` chưa xác thực; `403` không đủ quyền; `404` không có; `409` xung đột trạng thái; `422` dữ liệu không hợp lệ; `429` vượt giới hạn; `5xx` lỗi server.
- **Pagination**: **offset** (`?page=3`) đơn giản nhưng chậm và lệch khi dữ liệu thay đổi; **cursor/keyset** (`?after=<token>`) ổn định và nhanh với bảng lớn.
- **Versioning**: URL (`/v2/...`) hoặc header; ưu tiên **thay đổi tương thích ngược** (thêm field, không xoá/đổi nghĩa).
- **Lỗi nhất quán**: cấu trúc chuẩn (ví dụ **Problem Details, RFC 9457**) có `type`, `title`, `detail`, mã lỗi máy đọc được.
- **Đồng thời**: `ETag` + `If-Match` cho optimistic concurrency; **`Idempotency-Key`** cho `POST` quan trọng; header giới hạn tốc độ (`Retry-After`).
- **REST vs gRPC vs GraphQL**: REST dễ cache/dễ dùng công khai; **gRPC** (HTTP/2 + Protobuf) nhanh, hợp service-to-service; **GraphQL** linh hoạt truy vấn cho client đa dạng nhưng khó cache và kiểm soát chi phí.

```http
POST /v1/payments
Idempotency-Key: 7f3c-91ab
Content-Type: application/json

{ "orderId": "o-42", "amount": 120000, "currency": "VND" }
```

## 3. Visual Diagram

_No diagram needed._

## 4. Rules of Thumb & Trade-offs

- API công khai/đối tác → **REST + OpenAPI**; nội bộ hiệu năng cao → **gRPC**; nhiều loại client cần hình dạng dữ liệu khác nhau → cân nhắc **GraphQL/BFF**.
- **Luôn phân trang** mọi danh sách và đặt giới hạn tối đa kích thước trang.
- Trả về **vừa đủ**: tránh endpoint "chatty" (client gọi 20 lần) lẫn endpoint "god" trả mọi thứ.
- Trade-off: linh hoạt của client vs. khả năng cache/kiểm soát tải của server.

## 5. Must Remember / Production Pitfalls

- **Breaking change** (xoá field, đổi kiểu, đổi nghĩa) làm vỡ client cũ; có chính sách deprecation và đo ai còn dùng bản cũ.
- Trả **`200` kèm lỗi** trong body phá vỡ retry, monitoring và cache.
- **Offset pagination** trên bảng lớn (`OFFSET 1000000`) rất chậm; dữ liệu chèn giữa chừng làm trùng/sót bản ghi.
- Lộ **ID tuần tự** hoặc kiểm tra quyền chỉ ở tầng route gây **IDOR** — luôn kiểm tra quyền trên từng đối tượng.
- `POST` không idempotent: client retry khi timeout sẽ **tạo trùng** nếu không có idempotency key.
- Interview trap: "PUT khác POST thế nào?" → PUT **idempotent** và thay thế toàn bộ tại URL đã biết; POST tạo mới/hành động, có thể tạo trùng.

## 6. Search Hooks

- `REST API design best practices` — quy ước đặt tên, method, status code.
- `cursor pagination vs offset pagination` — phân trang ổn định cho bảng lớn.
- `API versioning backward compatibility` — tiến hoá API mà không phá client.
- `Problem Details RFC 9457` — chuẩn mô tả lỗi cho HTTP API.
- `REST vs gRPC vs GraphQL` — chọn kiểu API theo nhu cầu.
- `OpenAPI specification` — mô tả hợp đồng API bằng tài liệu máy đọc được.
