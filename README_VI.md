# EVENT DESIGN TOOLKIT 0.7.0 Multi-Version

Panel CEP tiếng Việt cho Adobe Illustrator, tập trung vào bốn thao tác.

| Công cụ | Tác dụng |
|---|---|
| Đổi cỡ chữ | Đặt cỡ, cộng/trừ pt, đổi theo phần trăm hoặc dùng cỡ mẫu. Có thể đặt giãn dòng (pt) cùng lúc hoặc giữ nguyên cỡ chữ. |
| Đồng bộ vị trí | Lấy một đối tượng làm mẫu và căn đúng đối tượng trên các artboard đích. |
| Đồng bộ kích thước | Lấy Rộng × Cao từ mẫu và áp dụng cho hình, nhóm vector hoặc khung chữ. Chọn giữ tỷ lệ, khớp một chiều hoặc khớp chính xác cả hai chiều. |
| Điền theo danh sách | Nhân bản artboard mẫu cùng artwork. Có thể điền chung một nội dung hoặc điền riêng hai mặt Việt–Anh. |

Mỗi tab có hướng dẫn thao tác và ví dụ ngay cạnh các tùy chọn. Giải nén **build/EVENT_DESIGN_TOOLKIT-Windows-0.7.0-Multi-Version.zip** rồi chạy **install_windows.cmd**. Mở **Window → Extensions → EVENT DESIGN TOOLKIT** và nhập key nếu cần kích hoạt.

Có thể chạy **build/0.7.0/EVENT_DESIGN_TOOLKIT.jsx** từ **File → Scripts → Other Script**. JSX dùng chung lõi và kích hoạt với panel.

Người quản trị tiếp tục cấp key bằng trang admin đã có. Gói **build/EVENT_DESIGN_TOOLKIT-Admin-0.7.0.zip** dùng cùng khóa ký và có hướng dẫn **ADMIN_VI.md**.

Manifest giữ mức tối thiểu Illustrator CC 2018 và CEP 8 của bản Multi-Version. Môi trường kiểm thử thực tế là Windows với Illustrator 30.8.1 và CEP 12.1.1. Bộ cài và công cụ chạy cục bộ. Node.js chỉ dùng cho kiểm thử phát triển.

## Mã nguồn

- **src/panel** chứa giao diện CEP và cầu nối.
- **src/host** chứa lõi ExtendScript.
- **src/fallback** chứa hộp thoại ScriptUI.
- **tests** chứa fixture cho bản rút gọn.
- **legacy-0.1.0** lưu mô-đun của bản đầy đủ trước đây.

Chạy **powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1** để tạo lại gói Windows, gói mã nguồn và JSX trong **build**.

[Hướng dẫn cài đặt](INSTALL_VI.md) · [Hướng dẫn sử dụng](USER_GUIDE_VI.md) · [Ma trận tính năng](FEATURE_MATRIX.md) · [Kiểm thử](TEST_PLAN.md)
