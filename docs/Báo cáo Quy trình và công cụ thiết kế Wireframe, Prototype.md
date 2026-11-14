# Báo cáo: Quy trình và công cụ thiết kế Wireframe, Prototype

Oct 27, 2026 · @Binh

## 1. Cơ sở lý thuyết

Thiết kế giao diện đi từ thô đến tinh qua ba mức độ chi tiết (fidelity): wireframe, mockup, prototype. Tách thành các bước giúp chốt từng loại quyết định một lần, thay vì vừa bàn bố cục vừa bàn màu sắc rồi sửa đi sửa lại.

|  | Wireframe | Mockup | Prototype |
| --- | --- | --- | --- |
| Câu hỏi trả lời | Màn hình có những gì, đặt ở đâu? | Trông như thế nào? | Dùng như thế nào? |
| Độ chi tiết | Thấp: khung, hộp, chữ giả, đen trắng | Cao: màu, font, icon, ảnh theo design system | Cao, thêm hành vi giữa các màn hình |
| Tương tác | Không | Không | Có: bấm, chuyển màn hình, luồng nghiệp vụ |
| Chi phí sửa | Rất thấp | Trung bình | Trung bình đến cao |
| Người xem chính | Nhóm dự án, giảng viên | Nhóm dự án, khách hàng | Người dùng thử, lập trình viên |

Nguyên tắc then chốt là sửa lỗi càng sớm càng rẻ: đổi vị trí một ô trong wireframe mất vài phút, còn đổi cấu trúc trang sau khi đã lập trình Angular và Spring Boot mất hàng giờ. Vì vậy wireframe phải đi trước và được duyệt trước khi áp design system.

Cách làm hiện tại của nhóm (làm đến đâu nhờ Claude Code dựng đến đó rồi chốt khi vừa mắt) bỏ qua bước wireframe và prototype. Hệ quả: chưa kiểm tra được luồng người dùng trước khi code, và không có tài liệu thiết kế để đối chiếu hay bàn giao.

## 2. Quy trình đề xuất

Quy trình gồm 8 bước, mỗi bước có sản phẩm đầu ra rõ ràng và một điểm duyệt trước khi sang bước tiếp theo.

| Bước | Việc làm | Sản phẩm đầu ra | Công cụ |
| --- | --- | --- | --- |
| 1. Phân tích yêu cầu | Xác định vai trò người dùng, chức năng, use case | Đặc tả use case, danh sách màn hình | Tài liệu use case của dự án |
| 2. Luồng và sitemap | Vẽ luồng thao tác chính và cây trang | User flow, sitemap | FigJam |
| 3. Wireframe | Phác bố cục từng màn hình ở mức thấp, chưa màu, chưa ảnh | Bộ wireframe đen trắng, đặt tên frame theo màn hình | Figma Design (Auto Layout) |
| 4. Design system | Chốt màu, font, khoảng cách, component dùng chung | Variables, style, component library | Figma (Variables, Components) |
| 5. Mockup | Áp design system lên wireframe đã duyệt, thêm dữ liệu mẫu thực tế | Bộ màn hình độ chi tiết cao, đủ trạng thái (rỗng, lỗi, đang tải) | Figma Design |
| 6. Prototype | Nối các màn hình thành luồng bấm được | Prototype tương tác theo từng luồng nghiệp vụ | Figma Prototype, Figma Make |
| 7. Đánh giá | Cho nhóm, giảng viên và vài người dùng thử đi hết luồng, ghi lại lỗi | Danh sách góp ý, bản thiết kế đã chỉnh | Figma comments, bảng ghi chú |
| 8. Bàn giao và hiện thực | Lập trình theo thiết kế, đối chiếu giao diện thật với bản thiết kế | Giao diện Angular khớp mockup, ghi chú chênh lệch | Figma Dev Mode, Figma MCP, Claude Code |

Điểm duyệt cần có: sau bước 3 duyệt cấu trúc và luồng; sau bước 5 duyệt hình thức; sau bước 7 duyệt toàn bộ trước khi bước vào code. Nhóm đã có design system nên có thể coi bước 4 là hoàn thành và chỉ rà lại cho khớp với Figma. Phần cần làm bổ sung là bước 3, 6 và 7 cho các màn hình hiện có.

## 3. Công cụ sử dụng

Figma làm nền chung cho cả quy trình, và AI chỉ hỗ trợ ở những bước lặp lại hoặc tốn thời gian; các quyết định về luồng và bố cục vẫn do nhóm duyệt.

| Công cụ | Vai trò | Bước |
| --- | --- | --- |
| Figma Design | Vẽ wireframe, mockup, quản lý component và biến thiết kế (Variables) | 3, 4, 5 |
| FigJam | Vẽ user flow, sitemap, ghi chú nhóm | 2 |
| Prototype mode | Nối frame thành luồng bấm được, xem thử trong trình duyệt | 6 |
| [Figma AI](https://figma-signup.helpjuice.com/prototyping-tools/make-interactions-with-ai) | Tự thêm tương tác giữa các frame đã chọn, đổi tên layer, điền nội dung mẫu | 5, 6 |
| [Figma Make](https://figma.com/solutions/ai-wireframe-generator/) | Sinh wireframe và prototype tương tác từ mô tả bằng lời, chỉnh tiếp bằng prompt hoặc trình chỉnh sửa trực quan | 3, 6 |
| [Figma MCP server](https://mcp.figma.com/mcp) | Cho Claude Code và Claude đọc thiết kế (cấu trúc, biến, component) thay vì đoán từ ảnh chụp | 8 |

### Figma MCP kết nối thế nào

MCP là chuẩn mở để công cụ AI truy cập dữ liệu bên ngoài. Với Figma, server từ xa tại `https://mcp.figma.com/mcp` cung cấp cho agent bố cục, biến thiết kế, ảnh chụp frame và ánh xạ Code Connect giữa component thiết kế với component trong mã nguồn. Cách khuyến nghị trong Claude Code là cài plugin Figma chính thức từ marketplace của Anthropic:

```bash
claude plugin install figma@claude-plugins-official
```

Plugin này đăng ký sẵn server `https://mcp.figma.com/mcp` cùng bộ skill `figma-generate-design`, `figma-design-to-code`, `figma-generate-library`, `figma-code-connect` và `figma-use-figjam`. Sau khi cài, xác thực bằng `/mcp` và đăng nhập tài khoản Figma.

Trạng thái hiện tại: **đã kết nối thành công**, tài khoản `binhhnhe` với ghế Full, file thiết kế `VinaFly — Design` (`B7hy1HdhsT2L6Tuvng8LxS`) đọc được qua MCP. Cần phân biệt hai đường truy cập:

| Đường | Xác thực | Quyền | Dùng cho |
| --- | --- | --- | --- |
| Plugin `figma` (MCP từ xa) | OAuth qua `/mcp` | Đọc và **ghi lên canvas** | Vẽ wireframe, mockup, prototype, tạo FigJam |
| Personal Access Token + `figma-developer-mcp` | Header `X-Figma-Token` | **Chỉ đọc** | Đọc dữ liệu thiết kế, xuất ảnh, đối soát handoff |

Token chỉ đọc không đủ để dựng thiết kế, nên mọi thao tác tạo/sửa phải đi qua plugin OAuth.

Lưu ý về chi phí: các tính năng AI của Figma [phân quyền theo gói và theo loại ghế](https://www.cmswire.com/digital-experience/figma-make-ai-prototyping-tool-exits-beta-for-all-users). Tài khoản dự án đang dùng ghế Full thuộc gói Starter nên Figma Make và Figma AI dùng được đầy đủ.

## 4. Áp dụng vào dự án web đặt vé máy bay nội địa

Nên làm wireframe theo thứ tự luồng nghiệp vụ chính của khách hàng trước, rồi mới đến khu vực quản trị, vì luồng đặt vé quyết định phần lớn cấu trúc dữ liệu và màn hình còn lại. Danh sách dưới đây là đề xuất ban đầu, cần đối chiếu với đặc tả use case của nhóm trước khi chốt.

| Ưu tiên | Nhóm màn hình | Ví dụ màn hình | Lý do |
| --- | --- | --- | --- |
| 1 | Tìm và đặt vé | Trang chủ tìm chuyến, danh sách chuyến bay, nhập thông tin hành khách, thanh toán, xác nhận | Luồng cốt lõi, nhiều trạng thái nhất |
| 2 | Sau đặt vé | Đặt chỗ của tôi, chi tiết đặt chỗ, hủy vé | Trạng thái vé và quy tắc hủy là phần dễ phát sinh nhiều trạng thái giao diện |
| 3 | Tài khoản khách hàng | Kho voucher, voucher của tôi, hồ sơ, đổi mật khẩu | Voucher chỉ nhận từ hệ thống, không nhập mã |
| 4 | Khu vực quản trị (ADMIN, STAFF) | Quản lý chuyến bay, giá vé, khuyến mãi, voucher, người dùng | Chỉ hai vai trò này được vào |

Cách phối hợp với Claude Code sau khi có thiết kế: Figma là nguồn chuẩn, mỗi màn hình là một frame được đặt tên rõ, và Claude Code chỉ dựng giao diện theo frame đã duyệt thông qua MCP, không tự quyết bố cục. Khi giao diện thật lệch thiết kế thì sửa code, còn khi muốn đổi thiết kế thì sửa Figma trước rồi mới sửa code. Cách này giữ được lịch sử quyết định thiết kế để trình bày với giảng viên.

Với các màn hình đã làm bằng Claude Code, có thể dựng ngược: chụp màn hình thật đưa vào Figma làm wireframe tham chiếu, rà lại theo quy trình ở mục 2, rồi mới chỉnh code.

## Nguồn tham khảo

- [Figma MCP server — hướng dẫn chính thức (GitHub)](https://github.com/figma/mcp-server-guide)
- [Figma MCP server — tài liệu nhà phát triển](https://developers.figma.com/docs/figma-mcp-server/)
- [Figma AI: thêm tương tác vào prototype](https://figma-signup.helpjuice.com/prototyping-tools/make-interactions-with-ai)
- [Trình tạo wireframe AI trong Figma Make](https://figma.com/solutions/ai-wireframe-generator/)
- [Figma Make ra mắt chính thức cho mọi gói](https://www.cmswire.com/digital-experience/figma-make-ai-prototyping-tool-exits-beta-for-all-users)
