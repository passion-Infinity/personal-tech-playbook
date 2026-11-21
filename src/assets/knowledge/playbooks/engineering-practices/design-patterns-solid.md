## 1. Core Concept

**SOLID** là năm nguyên tắc thiết kế hướng đối tượng giúp code **dễ thay đổi mà không vỡ**; **design pattern** là các lời giải đã được kiểm chứng cho vấn đề thiết kế lặp lại. Chúng không phải mục tiêu mà là **ngôn ngữ chung** để thảo luận và đánh giá thiết kế. Mental model: *mục đích duy nhất của thiết kế tốt là làm **chi phí của thay đổi tiếp theo** thấp — và việc thêm abstraction thừa cũng là một chi phí.*

## 2. How It Works

- **S — Single Responsibility**: một module có **một lý do để thay đổi**.
- **O — Open/Closed**: mở để mở rộng (thêm hành vi mới), đóng với sửa đổi (không động vào code đã chạy tốt) — thường qua đa hình/strategy.
- **L — Liskov Substitution**: kiểu con **thay thế được** kiểu cha mà không phá hợp đồng (không tăng điều kiện đầu vào, không giảm bảo đảm đầu ra).
- **I — Interface Segregation**: nhiều interface nhỏ, đúng nhu cầu, thay vì một interface "béo".
- **D — Dependency Inversion**: module cấp cao phụ thuộc **abstraction**, không phụ thuộc chi tiết; **Dependency Injection** truyền phụ thuộc từ ngoài vào.
- **Pattern dùng nhiều nhất**:
  - **Strategy** (đổi thuật toán lúc chạy), **Factory/Builder** (tạo đối tượng phức tạp), **Adapter** (nối interface không khớp).
  - **Decorator** (thêm hành vi bằng cách bọc), **Observer** (thông báo thay đổi), **Facade** (giao diện đơn giản cho hệ con).
- **Composition over inheritance**: ghép các đối tượng nhỏ thay vì cây kế thừa sâu.

```python
# Strategy + Dependency Inversion: thêm phương thức giảm giá mà không sửa Checkout
class Discount(Protocol):
    def apply(self, total: Decimal) -> Decimal: ...

class Checkout:
    def __init__(self, discount: Discount):   # phụ thuộc abstraction, được inject
        self.discount = discount
    def total(self, subtotal: Decimal) -> Decimal:
        return self.discount.apply(subtotal)
```

## 3. Visual Diagram

_No diagram needed._

## 4. Rules of Thumb & Trade-offs

| Triệu chứng | Hướng xử lý |
| --- | --- |
| Chuỗi `if/else` theo "loại" ở nhiều nơi | **Strategy / đa hình** |
| Tạo đối tượng nhiều bước, nhiều tham số | **Builder / Factory** |
| Thư viện bên ngoài lan khắp code | **Adapter** bọc lại một chỗ |
| Class làm quá nhiều việc | Tách theo **trách nhiệm** (SRP) |

- Chờ có **hai–ba trường hợp thật** rồi mới trừu tượng hoá (**rule of three**); **YAGNI** (đừng xây thứ chưa cần).
- Trade-off: **linh hoạt tương lai** vs **độ phức tạp hiện tại** — mỗi lớp trừu tượng thêm một lớp phải hiểu.

## 5. Must Remember / Production Pitfalls

- **Over-engineering**: interface và factory cho thứ chỉ có một cài đặt làm code khó đọc mà không có lợi.
- **DRY sai chỗ**: gộp hai đoạn code "giống nhau về hình dạng" nhưng khác lý do thay đổi tạo ra abstraction sai và coupling; **chấp nhận trùng lặp nhỏ còn hơn abstraction sai**.
- **Singleton** là trạng thái toàn cục trá hình: khó test, ẩn phụ thuộc; ưu tiên DI.
- **Kế thừa để tái sử dụng code** (thay vì quan hệ "là một") sinh ra cây phân cấp mong manh.
- Vi phạm **Liskov** (kiểu con ném lỗi "không hỗ trợ") là dấu hiệu phân cấp sai.
- Interview trap: "SOLID có luôn đúng không?" → là **heuristic**, áp dụng khi nó giảm chi phí thay đổi, không áp dụng máy móc.

## 6. Search Hooks

- `SOLID principles explained` — năm nguyên tắc thiết kế hướng đối tượng.
- `Strategy pattern vs State pattern` — hai pattern dễ nhầm với nhau.
- `dependency injection vs dependency inversion` — phân biệt kỹ thuật và nguyên tắc.
- `composition over inheritance` — ưu tiên ghép đối tượng hơn kế thừa.
- `rule of three DRY wrong abstraction` — khi nào nên trừu tượng hoá.
- `Liskov substitution principle violations` — dấu hiệu phân cấp kế thừa sai.
