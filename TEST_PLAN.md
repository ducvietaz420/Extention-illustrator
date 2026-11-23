# Kiểm thử EVENT DESIGN TOOLKIT 0.7.0 Multi-Version

Windows, Adobe Illustrator 30.8.1, CEP 12.1.1, ExtendScript 4.5.6.

| Ca kiểm thử | Kết quả mong đợi |
|---|---|
| Chữ 24/18 pt, tăng 150% | 36/27 pt, giữ font, màu, tracking và neo. |
| Chọn group, Area Text, layer khóa | Group đưa chữ vào phạm vi, Area Text còn sửa được, khung khóa hiện lý do. |
| Lấy cỡ mẫu và Large Canvas | Cỡ hiển thị theo pt tài liệu, mỗi quy đổi dùng hệ số một lần. |
| 20 artboard, tọa độ âm, khác kích thước | Căn vị trí theo ba chế độ, giữ nội dung và cỡ của đích, chạy lần hai không trôi. |
| Mẫu rộng 10 × cao 9 cm | Cùng tỷ lệ khớp hai chiều. Khác tỷ lệ báo lý do ở mặc định. Chọn chính xác cho ra 10 × 9 cm. |
| Đích đang chọn trên cùng artboard | Quét và áp dụng cho đúng các đích được chọn. Điểm neo, đối tượng mẫu và artwork ngoài selection được giữ. |
| Chỉ khớp rộng hoặc cao | Khớp chiều đã chọn, giữ tỷ lệ và điểm neo của đích. |
| Nhóm vector nhiều phần, nhóm lồng nhau có chữ | Đổi kích thước cả nhóm một lần. Giữ cấu trúc nhóm, giữ neo và giữ chữ còn sửa được. |
| Chữ điểm, chữ vùng và chữ không hỗ trợ | Khớp kích thước khung, giữ nội dung và khả năng sửa. Báo lý do với chữ chạy theo đường dẫn hoặc nối khung. |
| Trùng vai trò, đối tượng giao nhiều artboard, kế hoạch cũ | Bỏ qua hoặc chặn. Quét không sửa tài liệu. |
| Mẫu biển tên có nền và chữ | Mỗi mục phân cách bằng dấu chấm phẩy tạo một artboard cùng kích thước. Vị trí tương đối và thứ tự xếp chồng của artwork được giữ. Bản mẫu không đổi. |
| Danh sách có Unicode và xuống dòng | Giữ nguyên các dòng trong mỗi tên, font, cỡ chữ, căn đoạn và điểm neo. Nội dung liền nhau trên các dòng vẫn thuộc một mục cho đến dấu chấm phẩy. |
| Tự co cỡ và giãn dòng | Chữ điểm vượt artboard hoặc chữ vùng bị tràn được giảm cỡ. Leading cố định giảm theo cùng tỷ lệ, Auto Leading giữ phần trăm đã đặt, nội dung vừa sẵn giữ định dạng mẫu. |
| Nhập Leading theo pt | Đặt đúng giãn dòng cho toàn bộ khung, gồm cả ký tự xuống dòng. Chế độ Giữ nguyên cỡ chữ chỉ đặt giãn dòng. Ô trống giữ thiết lập đã có. |
| Biển gấp có hai khung được chọn | Mỗi bản mới nhận cùng một mục ở cả hai khung, giữ định dạng và điểm neo riêng, kể cả khung xoay 180° trong nhóm lồng. |
| Biển gấp Việt–Anh | Phân cách hai mặt bằng một dấu `|`. Nội dung nhiều dòng vào đúng khung dưới, trên, trái hoặc phải theo cấu hình. Báo lỗi khi thiếu một mặt, sai dấu phân cách hoặc tâm hai khung trùng trên trục đã chọn. |
| Xem trước với artwork phức tạp | Chỉ đọc vùng chọn và artboard, không đo nhóm nền hoặc quét các đối tượng trong tài liệu. Panel có thể dừng khi đang chuẩn bị artwork mà chưa tạo bản sao. |
| CEP và JSX | Bốn công cụ xuất hiện. Tab Điền theo danh sách có xem trước và thao tác tạo artboard. Bản cài đúng ID và phiên bản. |
| Key 1 ngày, 1 tháng, 1 năm, vĩnh viễn | Trang admin cấp đủ bốn loại. Key hợp lệ mở công cụ. Key hết hạn, sai chữ ký hoặc sai bộ khóa bị chặn. |
| Nhập key, mở lại, đổi và gỡ | Panel và JSX đọc chung kích hoạt. Key thay thế sai giữ nguyên kích hoạt hiện tại. Gỡ key đóng quyền sử dụng công cụ. |

## Kết quả bản 0.7.0

- Illustrator 30.8.1 xác nhận biển gấp với nội dung Việt–Anh nhiều dòng, mặt trên xoay 180°, giữ điểm neo và chỉ tự co mặt tràn. Mẫu di chuyển sau khi xem trước bị chặn.
- Mô phỏng lõi đạt cả bốn cách xếp, kiểm tra cú pháp danh sách, chế độ điền chung và hai khung cùng nhóm. Mô phỏng CEP hiển thị nội dung từng mặt và kiểm tra lại khi đổi vị trí. ScriptUI được kiểm thử mô phỏng.

## Kết quả bản 0.6.1

- Illustrator 30.8.1 xác nhận tự co chữ điểm và chữ vùng có xuống dòng. Leading đặt tay giảm theo tỷ lệ, Auto Leading tùy chỉnh giữ mức 160%. Nội dung, tracking, điểm neo và góc xoay 180° được giữ.
- Ca Đổi cỡ chữ xác nhận nhập leading theo pt, chế độ giữ cỡ, xử lý xuống dòng, Large Canvas và khôi phục cỡ cùng giãn dòng khi thao tác gặp lỗi.
- Mô phỏng CEP xác nhận ô nhập giãn dòng và cách hiển thị trong luồng Đổi cỡ chữ. Giữ cấu hình nhiều phiên bản của bản Multi-Version. Các bản Illustrator cũ chưa được chạy kiểm thử thực tế.

## Kết quả bản 0.6.0

- Edge chạy trang admin từ tệp cục bộ, cấp được cả bốn loại. Chữ ký được xác minh độc lập. Ca ngày 31, ngày cuối tháng và năm nhuận đạt.
- Illustrator thật 30.8.1 xác minh đủ bốn loại key ký thử, chặn trường hợp chưa kích hoạt, key sai hoặc hết hạn, và lưu được kích hoạt qua lần tải lại. ScriptUI khởi tạo màn hình kích hoạt và mở đủ bốn công cụ sau kích hoạt trên vùng dữ liệu tạm.
- Mô phỏng CEP xác nhận luồng nhập, xem hạn, gỡ và trở về màn hình kích hoạt khi key hết hạn. Giao diện CEP 0.6.0 chạy qua mô phỏng trình duyệt.
- Kiểm thử hồi quy Illustrator đạt cho biển gấp hai khung, gồm khung xoay 180°. Xem trước trên tài liệu thử có 960 vector nền hoàn tất trong khoảng 1 ms ở lần đo này.

## Kết quả bản 0.5.0

- Mô phỏng lõi xác nhận mỗi mục được điền vào cả hai khung, giữ cỡ và font riêng, vị trí tương đối, xuống dòng và góc xoay 180°. Vùng chọn trên hai artboard bị từ chối.
- Ca mô phỏng hiệu năng chặn truy cập artwork khi xem trước. Bước tạo trả tiến trình và cho dừng giữa các lượt kiểm tra artwork trước khi tạo bản sao. Ca mô phỏng giao diện Chromium xác nhận luồng tương ứng trong panel.
- Ca Illustrator thực cho biển gấp có nền phức tạp nằm trong **tests/fill-host.jsx**. Đã chạy lại và đạt trong đợt kiểm thử bản 0.6.0.

## Kết quả bản 0.4.0

- Illustrator 30.8.1 đã tạo bốn bản theo lưới 2 × 2 từ mẫu có nền khóa. Bản sao giữ nền, trạng thái khóa, font, cỡ, màu, căn giữa, điểm neo, tiếng Việt và xuống dòng. Kế hoạch cũ bị chặn nếu artboard thay đổi. Hủy giữa các lượt giữ những bản đã tạo.
- Ca chữ vùng bị tràn giữ đủ nội dung và cỡ chữ, đồng thời báo cần kiểm tra.
- Bản JSX đóng gói đã chạy luồng xem trước và tạo ba bản trong ScriptUI thực của Illustrator trên tài liệu tạm. Artboard gốc và tài liệu đang mở được giữ.
- Kiểm thử CEP mô phỏng ở 340 px đạt bốn tab, bản xem trước nhiều dòng, nội dung Unicode và thao tác tạo artboard từ kế hoạch. Giao diện CEP 0.4.0 chưa được mở trong Illustrator sau cập nhật.
- Các ca hồi quy đồng bộ vị trí, kích thước, đổi cỡ chữ và Large Canvas đạt trong Illustrator.

## Kết quả bản 0.3.0

- Illustrator thật đạt các ca chữ trộn cỡ, điểm neo, tọa độ và hệ số Large Canvas. Một Undo khôi phục cỡ và điểm neo trong ca hai khung từ 24 lên 29 pt.
- Đồng bộ kích thước đã chạy trong Illustrator với mẫu nhóm vector, PNG liên kết, chữ điểm nhiều dòng, chữ vùng xuống dòng và nhóm clipping có chữ. Kiểm tra kích thước, điểm neo, nội dung, cấu trúc, khả năng chỉnh sửa và chạy lại. Nhóm có phần tử khóa bị bỏ qua.
- Ca đồng bộ vị trí trên tài liệu 20 artboard với 17 đích ghi nhận quét 5 ms và áp dụng hai nhóm trong 16 ms, gồm các lần đo lại. Môi trường là máy Windows phát triển với Illustrator 30.8.1.
- Kiểm thử mô phỏng xác nhận giao diện CEP ở 340 px, hướng dẫn theo lựa chọn, xử lý mẫu có hoặc thiếu tên, phạm vi selection và thao tác quét/áp dụng. Bản panel 0.3.0 chưa được mở trong Illustrator sau cập nhật.
- ScriptUI khởi tạo và đọc được cả ba hướng dẫn trong Illustrator 30.8.1. Kiểm tra này chạy bố cục hộp thoại ở host mà không mở hộp thoại tương tác.
- Mô phỏng host xác nhận việc dừng áp dụng nếu bản thử làm thay đổi cách xuống dòng của chữ.

## Chạy lại

- Node.js cho phát triển. Chạy **node tests/license-signature.cjs**, **node tests/license-host.cjs**, **node tests/admin-browser.cjs**, **node tests/bridge.cjs**, **node tests/geometry-sync-mock.cjs**, **node tests/fill-multi-mock.cjs**, **node tests/fill-preview-mock.cjs** và **node tests/panel-browser.cjs**.
- Chạy **tests/prepare-native.ps1 -Performance**, rồi chạy từng JSX trong **build/qa-0.7.0** qua **File → Scripts → Other Script**. Xem kết quả trong các tệp **-result.txt** cùng thư mục.
- Trên Windows, có thể chạy **tests/text-undo.ps1** để kiểm tra Undo một nhóm hai khung thông qua COM.
- Xác minh tệp ZIP đã giải nén bằng **install_windows.cmd -CheckOnly**.
