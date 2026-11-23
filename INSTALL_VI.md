# Cài đặt EVENT DESIGN TOOLKIT 0.7.0 Multi-Version

1. Lưu các tài liệu đang làm, đóng Illustrator và giải nén toàn bộ gói **EVENT_DESIGN_TOOLKIT-Windows-0.7.0-Multi-Version.zip**.
2. Chạy **install_windows.cmd**. Thêm **-CheckOnly** nếu muốn chỉ xác minh gói và phiên bản host.
3. Mở Illustrator rồi chọn **Window → Extensions → EVENT DESIGN TOOLKIT**. Dán key do người quản trị cấp và bấm **Kích hoạt**.

Bộ cài giữ cùng ID và sao lưu bản đang cài vào **%LOCALAPPDATA%\EventDesignToolkit\backup-*** khi cập nhật. Vị trí cài theo người dùng là **%APPDATA%\Adobe\CEP\extensions\com.eventdesigntoolkit.illustrator**. Mức tối thiểu để bộ cài nhận panel là Illustrator CC 2018 với CEP 8. Bộ cài thiết lập **PlayerDebugMode** theo từng CEP tương thích phát hiện được. Các bản Illustrator cũ hơn có thể thử bản JSX nếu có ExtendScript và tọa độ artboard.

Dùng **install_windows.cmd -CheckOnly** để kiểm tra gói và các phiên bản phát hiện được. Với thư mục cài đặt tùy chỉnh, thêm **-IllustratorPath "đường dẫn đầy đủ tới Illustrator.exe"**. Bản này được chạy kiểm thử thực tế trên Illustrator 30.8.1 với CEP 12.1.1.

- **diagnose_windows.cmd** kiểm tra bản cài và ghi log vào **%LOCALAPPDATA%\EventDesignToolkit\windows.log**. Dùng **-CheckOnly** để chỉ đọc.
- **uninstall_windows.cmd** gỡ panel theo đúng ID. Thiết lập CEP dùng chung được giữ.
- **EVENT_DESIGN_TOOLKIT.jsx** chạy qua **File → Scripts → Other Script**. Bản JSX dùng chung trạng thái kích hoạt với panel. Chọn đối tượng trong tài liệu trước khi mở công cụ cần thao tác với đối tượng.

[Adobe hướng dẫn chạy script Illustrator](https://helpx.adobe.com/illustrator/desktop/automate-visualize-data/automate-actions/install-and-run-scripts.html)
