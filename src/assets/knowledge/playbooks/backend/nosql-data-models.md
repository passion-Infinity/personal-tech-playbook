## 1. Core Concept

NoSQL gồm bốn mô hình: **key-value**, **document**, **wide-column** và **graph**; mỗi mô hình tối ưu một mẫu truy cập và đổi lại bằng linh hoạt truy vấn. Mental model: *thiết kế SQL bắt đầu từ dữ liệu (chuẩn hoá); thiết kế NoSQL bắt đầu từ truy vấn (denormalize theo access pattern).*

## 2. How It Works

- **Key-value** (Redis, DynamoDB): get/put theo khoá, độ trễ thấp, scale ngang.
- **Document** (MongoDB, Cosmos): JSON lồng nhau, **embed** dữ liệu hay đọc cùng nhau, **reference** khi dữ liệu lớn/dùng chung.
- **Wide-column** (Cassandra, Bigtable): **partition key** + **clustering key**, ghi rất nhanh (LSM tree), truy vấn theo partition.
- **Graph** (Neo4j, Neptune): đỉnh và cạnh, duyệt quan hệ nhiều bước hiệu quả.
- **Modelling**: liệt kê truy vấn → thiết kế khoá → **denormalize/nhân bản** dữ liệu để mỗi truy vấn chạm một partition; **single-table design** trong DynamoDB.
- **Nhất quán**: đa số **eventual consistency** có thể chỉnh (quorum, read/write concern).
- **Scale**: **sharding** theo partition key; **hot partition** là rủi ro chính.
- **Giao dịch**: hạn chế hoặc theo phạm vi một partition/document.

## 3. Visual Diagram

_No diagram needed._

## 4. Rules of Thumb & Trade-offs

| Nhu cầu | Chọn |
| --- | --- |
| Truy cập theo khoá, scale lớn | Key-value/Wide-column |
| Đối tượng lồng nhau, schema linh hoạt | Document |
| Quan hệ sâu | Graph |
| Join, báo cáo ad-hoc, ACID | Quan hệ (SQL) |

- Trade-off: **scale và độ trễ dự đoán được** vs **linh hoạt truy vấn và ràng buộc toàn vẹn**.

## 5. Must Remember / Production Pitfalls

- Chọn NoSQL vì "hợp thời" rồi cần join/báo cáo phức tạp.
- **Partition key kém** → hot partition, throttle.
- Embed mảng phình vô hạn trong document vượt giới hạn kích thước.
- Denormalize mà không có kế hoạch cập nhật nhiều nơi → dữ liệu lệch.
- Không có schema ≠ không cần schema: ứng dụng vẫn phải quản lý phiên bản dữ liệu.
- Interview trap: "Khi nào chọn NoSQL?" → khi **mẫu truy cập rõ và scale ngang** quan trọng hơn truy vấn linh hoạt.

## 6. Search Hooks

- `document vs key-value vs wide-column vs graph` — bốn mô hình NoSQL.
- `DynamoDB single table design` — thiết kế theo access pattern.
- `Cassandra partition key clustering key` — mô hình wide-column.
- `MongoDB embed vs reference` — chọn cách mô hình tài liệu.
- `eventual consistency quorum` — nhất quán và quorum.
