## 1. Core Concept

**Thời gian** là nguồn bug âm thầm lớn nhất trong phần mềm: múi giờ, giờ mùa hè (DST), giây nhuận, đồng hồ máy lệch, và việc nhầm lẫn giữa **một thời điểm** với **một giờ trên đồng hồ treo tường**. Quy tắc nền: **lưu và truyền thời điểm bằng UTC**, chỉ **chuyển sang múi giờ người dùng khi hiển thị**, và **không bao giờ tin đồng hồ của máy khác**. Mental model: *"thời điểm tuyệt đối" (instant) và "giờ địa phương" (wall time) là hai khái niệm khác nhau, và mọi bug thời gian đều là nhầm một thứ với thứ kia.*

## 2. How It Works

- **Instant vs local time**: **instant** là một điểm trên trục thời gian toàn cầu (UTC/epoch); **local date-time** (`2026-03-08 02:30`) không xác định cho đến khi biết **múi giờ**; **zoned date-time** = local + zone (`Asia/Ho_Chi_Minh`).
- **UTC + IANA time zone**: lưu `timestamptz`/epoch UTC; dùng **tên múi giờ IANA** (`America/New_York`) chứ không dùng offset cố định (`-05:00`), vì **offset đổi theo DST** và theo luật từng nước.
- **DST**: có giờ **không tồn tại** (nhảy 02:00 → 03:00) và giờ **xuất hiện hai lần** (lùi 02:00 → 01:00) → phép cộng "24 giờ" khác "ngày mai cùng giờ".
- **Đồng hồ vật lý**: **wall clock** có thể **nhảy** (NTP chỉnh, giây nhuận); **monotonic clock** chỉ tiến, dùng để **đo khoảng thời gian/timeout**, không dùng để biết "mấy giờ".
- **Định dạng**: **ISO 8601 / RFC 3339** (`2026-11-21T09:30:00Z`) cho API và log.

```python
# Đúng: giữ instant ở UTC, chuyển múi giờ khi hiển thị
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
now = datetime.now(timezone.utc)                       # instant
local = now.astimezone(ZoneInfo("Asia/Ho_Chi_Minh"))   # chỉ để hiển thị
```

## 3. Visual Diagram

```mermaid
flowchart LR
    U["User input: local time + zone"] -->|"convert once at the edge"| UTC["Store: UTC instant"]
    UTC --> API["API: ISO 8601 with Z"]
    API -->|"convert for display"| V["User's time zone"]
```

## 4. Rules of Thumb & Trade-offs

- **Lưu UTC, hiển thị theo múi giờ người dùng**; lưu kèm **IANA zone** nếu cần tái tạo giờ địa phương (lịch hẹn lặp lại).
- **Sự kiện tương lai theo giờ địa phương** ("họp 9:00 sáng hằng ngày ở Berlin") nên lưu **local time + zone**, không phải UTC cố định — luật DST có thể đổi.
- Trade-off: **UTC đơn giản và so sánh được** vs **mất ngữ nghĩa giờ địa phương** cần cho lịch/nhắc hẹn.

## 5. Must Remember / Production Pitfalls

- **Cộng 86,400 giây ≠ cộng 1 ngày** ở ngày DST; dùng phép cộng theo lịch.
- **Lưu local time không kèm zone** → không thể phục hồi thời điểm thật.
- **Đo thời gian bằng wall clock** (`System.currentTimeMillis`) khi NTP chỉnh đồng hồ → độ trễ âm/sai; dùng **monotonic** (`System.nanoTime`, `time.monotonic()`).
- **Cron theo giờ địa phương** chạy 0 hoặc 2 lần vào ngày DST; chạy cron theo UTC.
- **So sánh timestamp cross-node** để xác định "ai ghi sau" (last-write-wins) mất dữ liệu khi đồng hồ lệch.
- Interview trap: "Vì sao không lưu offset `+07:00` thay cho tên múi giờ?" → offset **không mã hoá luật DST/thay đổi tương lai** của vùng.

## 6. Search Hooks

- `UTC vs local time storing timestamps` — lưu thời điểm tuyệt đối và hiển thị theo múi giờ.
- `IANA time zone database DST pitfalls` — vì sao dùng tên múi giờ và bẫy giờ mùa hè.
- `monotonic clock vs wall clock` — đồng hồ đo khoảng thời gian và đồng hồ treo tường.
- `ISO 8601 RFC 3339 timestamps` — định dạng thời gian chuẩn cho API.
- `Falsehoods programmers believe about time` — danh sách các giả định sai về thời gian.
- `Lamport clocks vector clocks` — đồng hồ logic thay cho đồng hồ vật lý trong hệ phân tán.
