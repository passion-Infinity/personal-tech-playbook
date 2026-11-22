## 1. Core Concept

**Prompt engineering** là thiết kế đầu vào để model cho kết quả đúng, ổn định và kiểm chứng được. Với kỹ sư, nó giống viết **specification**: rõ mục tiêu, ngữ cảnh, ràng buộc và định dạng đầu ra. Mental model: *model là đồng nghiệp rất giỏi nhưng không biết gì về dự án của bạn — prompt là bản briefing.*

## 2. How It Works

- **Cấu trúc tốt**: vai trò/mục tiêu → ngữ cảnh → ràng buộc → ví dụ → định dạng đầu ra.
- **Few-shot**: 2–5 ví dụ đầu vào/đầu ra thể hiện đúng định dạng và biên.
- **Cô lập dữ liệu và chỉ dẫn** bằng thẻ như `<document>…</document>` hoặc XML/Markdown.
- **Structured output**: yêu cầu JSON theo schema, dùng tính năng structured output/tool schema của API, rồi **validate**.
- **Chain-of-thought / suy luận**: cho model không gian suy nghĩ với bài khó; reasoning model đã làm nội bộ.
- **System prompt vs user prompt**: system đặt hành vi cố định; user là yêu cầu cụ thể.
- **Lặp và đo**: sửa prompt như sửa code, có **bộ test/eval** để thấy hồi quy.
- **Kỹ thuật phụ**: nêu rõ "không làm gì", cho phép trả lời "không biết", tách bài lớn thành chuỗi bước (**prompt chaining**).

```text
Bạn là reviewer. Chỉ báo bug thật, bỏ qua style.
<diff>…</diff>
Trả JSON: [{"file","line","issue","severity"}]. Nếu không có bug, trả [].
```

## 3. Visual Diagram

_No diagram needed._

## 4. Rules of Thumb & Trade-offs

- Cụ thể hơn là dài hơn: thêm **ngữ cảnh và tiêu chí thành công**, không thêm lời hoa mỹ.
- Ví dụ mạnh hơn mô tả, nhưng model có thể **bắt chước quá sát** ví dụ.
- Trade-off: **độ chi tiết** vs **chi phí token** và độ cứng nhắc.

## 5. Must Remember / Production Pitfalls

- Prompt không phải bảo mật: **prompt injection** có thể ghi đè chỉ dẫn.
- Yêu cầu mâu thuẫn nhau làm kết quả không ổn định.
- Output JSON không validate sẽ vỡ ở production.
- Đổi model hoặc phiên bản làm prompt cũ chạy khác; cần eval khi nâng cấp.
- `temperature` cao cho kết quả đa dạng nhưng kém tái lập.
- Interview trap: "Làm sao đảm bảo model trả đúng định dạng?" → schema/structured output + validate + retry, không chỉ "xin lịch sự".

## 6. Search Hooks

- `few-shot prompting` — dùng ví dụ để định hướng đầu ra.
- `structured outputs JSON schema LLM` — ép đầu ra đúng schema.
- `chain of thought prompting` — cho model suy luận từng bước.
- `prompt chaining` — tách tác vụ lớn thành nhiều lời gọi.
- `system prompt design` — thiết kế hành vi cố định cho model.
