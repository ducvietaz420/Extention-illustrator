# Cài đặt EVENT DESIGN TOOLKIT 0.6.0 đa phiên bản

Giải nén toàn bộ gói **EVENT_DESIGN_TOOLKIT-Windows-0.6.0-Multi-Version.zip** trước khi dùng.

## Illustrator CC 2018 trở lên có CEP 8 trở lên

1. Lưu tài liệu và thoát hẳn Illustrator.
2. Chạy **install_windows.cmd** bằng tài khoản Windows dùng để mở Illustrator. Bộ cài nhận diện Illustrator và phiên bản CEP, kể cả khi có nhiều bản trên cùng máy.
3. Mở lại Illustrator, mở tài liệu rồi chọn **Window → Extensions → EVENT DESIGN TOOLKIT**. Dán key do người quản trị cấp và bấm **Kích hoạt**.

Panel được cài vào **%APPDATA%\Adobe\CEP\extensions\com.eventdesigntoolkit.illustrator**. Bộ cài bật **PlayerDebugMode** ở khóa **HKCU\Software\Adobe\CSXS.<phiên bản CEP>** ứng với mỗi runtime phát hiện được để nạp panel chưa ký. Khi cập nhật, bản panel cũ được sao lưu vào **%LOCALAPPDATA%\EventDesignToolkit\backup-***. Nếu vừa cài thêm một bản Illustrator dùng CEP khác, chạy lại bộ cài để nhận diện runtime mới.

## Illustrator cũ hoặc không có menu Extensions

Với Illustrator có ExtendScript từ **CS5**, mở **File → Scripts → Other Script** và chọn **EVENT_DESIGN_TOOLKIT.jsx** trong gói đã giải nén. Bản JSX có bốn công cụ và dùng chung key, trạng thái kích hoạt với panel. Illustrator cũ có giới hạn artboard riêng theo phiên bản. [Adobe hướng dẫn chạy script Illustrator](https://helpx.adobe.com/illustrator/desktop/automate-visualize-data/automate-actions/install-and-run-scripts.html)

## Kiểm tra và gỡ cài đặt

- **install_windows.cmd -CheckOnly** xác minh gói và báo cách mở phù hợp với từng bản Illustrator tìm được. Nếu dùng thư mục cài tùy chỉnh, thêm **-IllustratorPath "đường dẫn đầy đủ tới Illustrator.exe"**.
- **diagnose_windows.cmd** hiển thị các bản Illustrator, CEP, panel đã cài và ghi log vào **%LOCALAPPDATA%\EventDesignToolkit\windows.log**. Dùng **-CheckOnly** để chỉ đọc.
- **uninstall_windows.cmd** gỡ panel theo ID. Trạng thái kích hoạt và thiết lập CEP dùng chung được giữ.
