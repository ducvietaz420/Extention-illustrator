# Ghi chú API

Panel truyền JSON đã mã hóa qua **CSInterface.evalScript** đến hàm **EDT.dispatch**. Lệnh quét và áp dụng chạy trên cùng lõi ExtendScript với bản ScriptUI. Kế hoạch lưu tham chiếu tài liệu và kiểm tra lại nguồn, đối tượng khớp, tọa độ và phạm vi trước khi sửa.

## Kích hoạt offline

Trang admin ký thông tin của key bằng Web Crypto. Lõi ExtendScript xác minh chữ ký RSA 2048 bit với SHA-256 và kiểm tra hạn trước khi thực thi lệnh. Bộ cài chỉ cần khóa công khai. Hồ sơ người dùng lưu kích hoạt dùng chung giữa panel và ScriptUI. [Web Crypto](https://www.w3.org/TR/webcrypto/) · [RSA PKCS #1](https://www.rfc-editor.org/rfc/rfc8017)

## Tọa độ, điểm neo và đơn vị

Lõi chuẩn hóa về hệ document tọa độ X sang phải, Y lên trên. Vị trí khớp theo artboard cục bộ. Ba chế độ dùng khoảng cách đến mốc, tỷ lệ so với artboard, hoặc mốc và độ lệch chỉ định. Đối tượng giao nhiều artboard được báo. Namespaced metadata nằm trong dòng cuối của PageItem.note.

Kích thước được đo theo **geometricBounds** của artwork. Với clipping group, geometry dùng mặt nạ clipping. Rộng và Cao trong panel lấy từ tài liệu, đổi sang cm với hệ số Large Canvas. Chế độ kích thước lấy điểm neo đích trước khi resize, rồi bù tọa độ để điểm neo đó đứng yên. Kiểm tra lại kích thước sau biến đổi.

Khi đồng bộ kích thước chữ điểm, chữ vùng hoặc nhóm chứa các loại chữ đó, lõi dùng **resize** trên đối tượng. Trong bước áp dụng, lõi đo một bản sao tạm và so sánh nội dung từng dòng trước khi sửa bản gốc. Bản sao được dọn trong **finally**. Lõi cũng kiểm tra lại bố cục chữ trên kết quả. Khung chữ còn chỉnh sửa được, và biến đổi theo hai trục có thể đổi tỷ lệ ký tự.

Đổi cỡ chữ gán **characterAttributes.size** theo từng ký tự. Neo dùng bounds của khung. Với Large Canvas, giá trị pt nhập và hiển thị dùng hệ số nội bộ đúng một lần.

Khi nhập giãn dòng, **Đổi cỡ chữ** đặt **characterAttributes.leading** cố định trong toàn bộ khung, gồm cả ký tự xuống dòng, rồi đo lại điểm neo. Nếu cần tự co cỡ ở **Điền theo danh sách**, leading cố định được tính bằng leading mẫu nhân với tỷ lệ cỡ mới trên cỡ mẫu. Auto Leading tiếp tục dùng tỷ lệ phần trăm của Illustrator. [Adobe về giãn dòng](https://helpx.adobe.com/illustrator/desktop/design-with-text/edit-format-text/adjust-line-and-character-spacing.html)

## Điền theo danh sách

Lõi dùng các khung chữ được chọn để xác định một artboard mẫu chung. Khi tạo, nó thêm artboard cùng kích thước và sao chép các đối tượng của mẫu theo độ lệch giữa hai artboard. Mỗi mục thay nội dung trên các bản sao của khung chữ đã chọn. Lõi giữ định dạng từng khung, kiểm tra ma trận xoay và căn lại điểm neo của chữ điểm. [Adobe về nhân bản artboard và artwork](https://helpx.adobe.com/illustrator/desktop/create-manage-artboards/organize-manage-artboards/use-artboard-context-menu.html)

Dấu chấm phẩy phân cách artboard. Các dấu xuống dòng bên trong mỗi mục được đổi sang ký tự xuống đoạn của Illustrator khi điền chữ. Bước xem trước chỉ đọc danh sách, artboard và thông tin các khung được chọn. Panel kiểm tra artwork ở lớp gốc theo từng lượt khi tạo, sau đó mới sao chép. Một lần Illustrator đang xử lý một đối tượng có thể mất thêm thời gian. Nút dừng có hiệu lực giữa các lượt xử lý của panel.

Trong chế độ Hai mặt Việt–Anh, mỗi mục có một dấu `|` giữa hai nội dung. Lõi so sánh tâm của hai khung đã chọn theo trục tương ứng với vị trí người dùng chọn. Xem trước ghi nhận khung nào nhận tiếng Việt và khung nào nhận tiếng Anh. Khi tạo, lõi đối chiếu lại vùng chọn và vị trí trước khi điền.

[Adobe Illustrator Developer](https://developer.adobe.com/illustrator/) · [CEP Resources](https://github.com/Adobe-CEP/CEP-Resources)
