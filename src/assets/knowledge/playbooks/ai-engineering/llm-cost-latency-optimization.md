## 1. Core Concept

Chi phí và độ trễ LLM chủ yếu đến từ **số token** (input + output) và **kích cỡ model**. Tối ưu là giảm token, chọn model vừa đủ và tận dụng cache/batch, mà không làm tụt chất lượng. Mental model: *trả tiền theo token, chờ theo token output — cắt cả hai.*

## 2. How It Works

- **Giá**: input rẻ hơn output; output sinh **tuần tự** nên chiếm phần lớn độ trễ.
- **Time-to-first-token (TTFT)** phụ thuộc prompt dài (prefill); **tốc độ token** phụ thuộc decode.
- **Model routing**: model nhỏ cho tác vụ dễ, model lớn khi khó (cascade).
- **Prompt caching**: giảm giá và TTFT cho phần prefix lặp lại.
- **Batch API**: tác vụ không gấp (xử lý hàng loạt) rẻ hơn đáng kể, trả kết quả không đồng bộ.
- **Streaming**: hiển thị sớm giúp cảm nhận nhanh hơn.
- **Giảm token**: prompt gọn, truy xuất chỉ phần cần (RAG), cắt output (`max_tokens`, yêu cầu ngắn gọn), tóm tắt lịch sử.
- **Semantic cache**: tái dùng câu trả lời cho truy vấn giống nhau (cẩn thận độ chính xác).
- **Song song hoá** các lời gọi độc lập; giới hạn **rate limit** và retry có backoff.
- **Giám sát**: theo dõi token, chi phí theo tính năng/người dùng.

## 3. Visual Diagram

_No diagram needed._

## 4. Rules of Thumb & Trade-offs

- **Đo trước khi tối ưu**: xem token theo từng bước/tính năng.
- Thử model nhỏ trước với eval; chỉ nâng cấp khi chất lượng không đạt.
- Trade-off: **chi phí/độ trễ** vs **chất lượng** vs **độ phức tạp** (router, cache).

## 5. Must Remember / Production Pitfalls

- Agent nhiều bước nhân token theo số vòng; đặt **ngân sách** và giới hạn bước.
- Cache bị vô hiệu khi phần đầu prompt đổi (timestamp, id ở đầu).
- Cắt context quá tay làm mất thông tin và tăng lỗi → tốn hơn do làm lại.
- Retry không giới hạn khi bị rate limit làm tăng chi phí.
- Không có hạn mức chi tiêu → hoá đơn bất ngờ.
- Interview trap: "Giảm độ trễ chat?" → streaming, giảm output, prompt caching, model nhỏ hơn.

## 6. Search Hooks

- `LLM prompt caching cost` — giảm chi phí phần prefix lặp lại.
- `LLM model cascade routing` — chuyển tác vụ khó lên model mạnh hơn.
- `batch API LLM` — xử lý bất đồng bộ giá rẻ.
- `time to first token TTFT` — độ trễ đến token đầu tiên.
- `semantic caching LLM` — tái dùng câu trả lời cho truy vấn tương tự.
