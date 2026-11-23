# Ma trận tính năng 0.7.0 Multi-Version

| Công cụ | Đã triển khai | Phạm vi |
|---|---|---|
| Đổi cỡ chữ | Panel và JSX | Point Text và Area Text độc lập. Giữ định dạng theo từng ký tự và điểm neo. |
| Đồng bộ vị trí | Panel và JSX | Ghép theo vai trò hoặc tên. Panel có khoảng cách theo mốc, tỷ lệ vị trí và độ lệch nhập tay. JSX có khoảng cách từ góc trên trái hoặc vị trí tương đối. |
| Đồng bộ kích thước | Panel và JSX | Hình, nhóm vector, chữ điểm và chữ vùng độc lập. Kích thước của nhóm gồm cả vector và chữ được đo trên toàn nhóm. Panel nhận đích đang chọn hoặc theo artboard. JSX nhận đích theo artboard. |
| Điền theo danh sách | Panel và JSX | Mỗi mục được điền vào mọi khung chữ đã chọn trên artboard mẫu. Khi chữ tràn, tự giảm cỡ chữ và leading đặt tay theo cùng tỷ lệ. |
| Biển tên Việt–Anh | Panel và JSX | Chọn hai khung theo vị trí trên mẫu. Mỗi mục có nội dung riêng cho mỗi mặt. |
| Giãn dòng | Panel và JSX | Nhập leading cố định theo pt trong Đổi cỡ chữ. Có thể giữ nguyên cỡ chữ. |
| Hướng dẫn từng thao tác | Panel và JSX | Panel có giải thích và ví dụ cạnh tùy chọn. JSX có hướng dẫn theo tab. |
| Kích hoạt offline | Panel và JSX | Kiểm tra chữ ký và hạn trước khi thực hiện lệnh. Kích hoạt lưu theo hồ sơ người dùng. |
| Cấp key | Trang admin riêng | 1 ngày, 1 tháng, 1 năm hoặc vĩnh viễn. Cần tệp ký riêng phù hợp với gói phát hành. |

Mức tối thiểu theo manifest Multi-Version là Illustrator CC 2018 và CEP 8. Kết quả trên Illustrator 30.8.1 và kiểm thử giao diện mô phỏng được ghi trong [TEST_PLAN.md](TEST_PLAN.md). Chữ chạy theo đường dẫn và chữ nối nhiều khung được báo giới hạn khi đổi kích thước.
