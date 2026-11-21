# Ma trận tính năng 0.6.0

| Công cụ | Đã triển khai | Phạm vi |
|---|---|---|
| Đổi cỡ chữ | Panel và JSX | Point Text và Area Text độc lập. Giữ định dạng theo từng ký tự và điểm neo. |
| Đồng bộ vị trí | Panel và JSX | Ghép theo vai trò hoặc tên. Panel có khoảng cách theo mốc, tỷ lệ vị trí và độ lệch nhập tay. JSX có khoảng cách từ góc trên trái hoặc vị trí tương đối. |
| Đồng bộ kích thước | Panel và JSX | Hình, nhóm vector, chữ điểm và chữ vùng độc lập. Kích thước của nhóm gồm cả vector và chữ được đo trên toàn nhóm. Panel nhận đích đang chọn hoặc theo artboard. JSX nhận đích theo artboard. |
| Điền theo danh sách | Panel và JSX | Nhân bản artboard và artwork từ một mẫu. Mỗi mục được điền vào mọi khung chữ đã chọn. Giữ xuống dòng, font, điểm neo và góc xoay. Tự giảm cỡ chữ bị tràn trên bản mới. |
| Hướng dẫn từng thao tác | Panel và JSX | Panel có giải thích và ví dụ cạnh tùy chọn. JSX có hướng dẫn theo tab. |
| Kích hoạt offline | Panel và JSX | Kiểm tra chữ ký và hạn trước khi thực hiện lệnh. Kích hoạt lưu theo hồ sơ người dùng. |
| Cấp key | Trang admin riêng | 1 ngày, 1 tháng, 1 năm hoặc vĩnh viễn. Cần tệp ký riêng phù hợp với gói phát hành. |

Bản Windows có panel cho Illustrator CC 2018 trở lên với CEP 8 trở lên và hộp thoại JSX cho Illustrator có ExtendScript từ CS5. Kết quả trên Illustrator thật và kiểm thử mô phỏng được ghi trong [TEST_PLAN.md](TEST_PLAN.md). Chữ chạy theo đường dẫn và chữ nối nhiều khung được báo giới hạn khi đổi kích thước.
