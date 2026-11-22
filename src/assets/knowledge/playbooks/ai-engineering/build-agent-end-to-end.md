## 1. Core Concept

Xây một agent thực tế là kỹ thuật phần mềm bình thường quanh một vòng lặp LLM: **định nghĩa tool, vòng lặp có giới hạn, quản lý context, kiểm chứng và quan sát**. Mental model: *agent = `while` loop gọi model, thực thi tool, nạp kết quả — phần khó là ranh giới an toàn và đo lường.*

## 2. How It Works

- **Thiết kế trước**: mục tiêu, tiêu chí hoàn thành kiểm chứng được, tool tối thiểu, ngân sách (bước, token, thời gian).
- **Vòng lặp tối giản**:

```python
msgs = [system, user_goal]
for step in range(MAX_STEPS):
    reply = llm(msgs, tools=TOOLS)
    if not reply.tool_calls:
        return reply.text
    for call in reply.tool_calls:
        result = run_tool(call)        # validate args, sandbox, truncate
        msgs.append(tool_result(call, result))
raise Exceeded("max steps")
```

- **Tool**: schema chặt, kết quả ngắn gọn, lỗi trả về dạng văn bản để model tự sửa.
- **Context**: tóm tắt khi dài, ghi kế hoạch ra file/todo.
- **Kiểm chứng**: chạy test/validator trước khi coi là xong.
- **Quan sát**: log mỗi bước (prompt, tool, token, độ trễ) thành trace.
- **Eval**: bộ nhiệm vụ mẫu đo tỷ lệ hoàn thành, số bước, chi phí.

## 3. Visual Diagram

_No diagram needed._

## 4. Rules of Thumb & Trade-offs

- Bắt đầu với **ít tool, một agent**; thêm độ phức tạp khi eval chứng minh cần.
- Tool ghi/xoá: **dry-run, xác nhận, idempotent**.
- Dùng SDK/framework khi cần trace, retry, handoff; tự viết khi muốn hiểu và kiểm soát.
- Trade-off: **tự chủ** vs **kiểm soát và chi phí**.

## 5. Must Remember / Production Pitfalls

- Thiếu `MAX_STEPS` và ngân sách → vòng lặp đốt tiền.
- Tool trả dữ liệu khổng lồ làm tràn context.
- Tin lời model "đã xong" mà không kiểm chứng.
- Chạy mã/lệnh do model sinh ngoài sandbox.
- Không có trace thì không debug được.
- Interview trap: "Agent bị kẹt lặp lại cùng một tool call?" → phát hiện lặp, thêm giới hạn, phản hồi lỗi rõ, hoặc chuyển người xử lý.

## 6. Search Hooks

- `building effective agents` — hướng dẫn thiết kế agent đơn giản, hiệu quả.
- `agent observability tracing` — theo dõi từng bước của agent.
- `LLM agent sandbox code execution` — chạy mã an toàn.
- `agent evals task success rate` — đo agent bằng bộ nhiệm vụ.
- `OpenAI Agents SDK vs LangGraph` — các framework điều phối.
