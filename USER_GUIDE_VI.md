# Hướng dẫn EVENT DESIGN TOOLKIT 0.6.0

Mở tài liệu trong Adobe Illustrator rồi chọn **Window → Extensions → EVENT DESIGN TOOLKIT**. Dùng **Selection Tool (V)** để chọn khung chữ hoặc đối tượng. Giữ **Shift** khi bấm để chọn nhiều đối tượng. Nếu đang gõ chữ, nhấn **Esc** để thoát chế độ sửa chữ trước khi chọn.

Lần đầu mở Toolkit, dán toàn bộ key do người quản trị cấp và bấm **Kích hoạt**. Sau đó, dùng nút **Key** để xem thời hạn, đổi key hoặc gỡ key khỏi hồ sơ hiện tại. Khi key hết hạn, dán key mới để mở lại công cụ. Panel và JSX chia sẻ kích hoạt trên cùng hồ sơ người dùng.

**Artboard** là khung trang trắng trong tài liệu. Mở **Window → Artboards** để xem thứ tự các trang. Khi công cụ yêu cầu danh sách artboard, nhập số thứ tự như **2, 4–6** để chọn các artboard 2, 4, 5 và 6.

Ba công cụ chỉnh đối tượng có hai bước. **Xem kế hoạch** cho biết đối tượng nào sẽ đổi và giá trị trước, sau. **Áp dụng** thực hiện các mục sẵn sàng. Sau khi đổi lựa chọn hoặc thông số, bấm **Xem kế hoạch** lại.

## 1. Đổi cỡ chữ hàng loạt

Ví dụ muốn đưa tất cả tiêu đề đang chọn về **30 pt**.

1. Dùng **Selection Tool (V)** để chọn các khung chữ. Có thể chọn cả nhóm chứa khung chữ.
2. Trong **Đổi cỡ chữ**, chọn **Phạm vi → Đối tượng đang chọn**. Có thể chọn **Artboard hiện tại**, **Danh sách artboard** hoặc **Toàn tài liệu** khi cần đổi trên phạm vi rộng hơn.
3. Chọn **Cách đổi cỡ → Đặt cỡ chữ**, rồi nhập **30** ở **Cỡ mới (pt)**.
4. Trong **Giữ điểm neo**, chọn **Trên giữa** nếu muốn điểm giữa cạnh trên của từng khung ở nguyên vị trí khi chữ lớn lên hoặc nhỏ đi. Chọn **Trên trái** nếu muốn giữ góc trên trái, hoặc **Tâm** nếu muốn khung thay đổi quanh tâm.
5. Bấm **Xem kế hoạch**, kiểm tra số khung và cỡ chữ trước, sau, rồi **Áp dụng**.

| Cách đổi cỡ | Ví dụ |
|---|---|
| **Đặt cỡ chữ** | Nhập **30** để đưa tất cả chữ trong phạm vi về 30 pt. |
| **Tăng hoặc giảm theo pt** | Nhập **2** để chữ 24 pt thành 26 pt. Nhập **-2** để giảm còn 22 pt. |
| **Nhân theo phần trăm** | Nhập **150** để tăng lên 150% cỡ ban đầu. Một khung có chữ 24 pt và 18 pt sẽ thành 36 pt và 27 pt. |
| **Dùng cỡ của mẫu** | Chọn một khung có cùng cỡ chữ xuyên suốt, bấm **Lấy cỡ chữ mẫu**, rồi chọn khung đích hoặc phạm vi và xem kế hoạch. |

Font, màu và nội dung chữ được giữ khi đổi cỡ. Nếu chữ đã chuyển thành đường viền bằng **Create Outlines**, Illustrator xem đó là hình vector. Dùng **Đồng bộ kích thước** nếu muốn đổi kích thước của hình đó.

## 2. Đồng bộ vị trí giữa các artboard

Ví dụ có một logo tương ứng trên mỗi artboard. Logo ở artboard 1 đã đặt đúng và cần đưa logo trên artboard 2–5 về cùng vị trí.

### Chuẩn bị cách nhận diện

Toolkit tìm đối tượng dựa trên **tên đối tượng trong bảng Layers** hoặc **vai trò**. Cả hai đều dùng để chỉ ra đối tượng tương ứng, kể cả khi nội dung hiển thị khác nhau.

- **Dùng tên.** Mở **Window → Layers**. Mở rộng layer chứa logo, bấm đúp mục đối tượng hoặc nhóm và đặt tên, chẳng hạn **Logo hội nghị**. Đặt cùng tên trên đối tượng mẫu và mỗi đối tượng đích. Nếu đang sửa tên layer, mở layer để tới dòng đối tượng hoặc nhóm bên trong.
- **Dùng vai trò.** Vai trò là nhãn bạn đặt trong Toolkit, chẳng hạn **logo-chinh**. Trong Illustrator, giữ **Shift** và chọn tất cả logo tương ứng, gồm logo mẫu và các logo đích. Trong **Đồng bộ vị trí → Nhận diện và gán vai trò**, nhập **logo-chinh** ở **Vai trò của đối tượng**, rồi bấm **Gán vai trò cho đối tượng đang chọn**. Có thể gán cùng nhãn qua nhiều lượt chọn. Sau đó bỏ chọn, chọn riêng logo mẫu và bấm **Lấy làm mẫu**.

Mỗi artboard đích nên có đúng một đối tượng mang tên hoặc vai trò cần tìm. Nếu một artboard có cả logo hội nghị và logo tài trợ, dùng hai nhãn riêng như **logo-chinh** và **logo-tai-tro**. Với logo gồm nhiều mảnh, chọn hoặc đặt nhãn cho cả nhóm logo. Lưu file AI để dùng lại vai trò đã gán khi mở tài liệu lần sau.

### Lấy mẫu và căn đích

1. Trong **Đồng bộ vị trí**, chọn đúng một logo ở artboard 1 và bấm **Lấy làm mẫu**.
2. Trong **Artboard đích**, chọn **Danh sách artboard** và nhập **2–5**. Chọn **Tất cả artboard khác** nếu muốn xử lý toàn bộ trang đích.
3. Trong **Nhận diện và gán vai trò → Ghép đối tượng**, để **Dùng vai trò hoặc tên của mẫu** nếu đã đặt cùng tên hoặc cùng vai trò. Công cụ dùng vai trò của mẫu khi có, sau đó mới dùng tên. Bạn cũng có thể chọn trực tiếp **Theo vai trò** hoặc **Theo tên đối tượng**. Nhập nhãn hoặc tên đích nếu chúng khác mẫu. Để ô trống để dùng giá trị tương ứng của mẫu.
4. Nếu cần chỉnh cách đặt vị trí, mở **Điểm neo và cách căn**. Chọn mốc artboard, điểm neo đối tượng và cách tính vị trí theo ví dụ dưới đây.
5. Bấm **Xem kế hoạch**. Kiểm tra vị trí trước, sau và các artboard báo thiếu hoặc trùng. Bấm **Áp dụng** hoặc **Áp dụng mục hợp lệ**. Lượt này di chuyển các đối tượng đích và giữ kích thước của chúng.

### Mốc artboard và điểm neo khác nhau thế nào?

- **Mốc artboard** là điểm tham chiếu trên trang, chẳng hạn **Trên trái**, **Trên giữa** hoặc **Tâm**.
- **Điểm neo đối tượng** là điểm trên khung đo quanh logo hoặc đối tượng. Chọn **Trên trái** để căn góc khung, **Trên giữa** để căn giữa cạnh trên, hoặc **Tâm** để căn chính giữa. Hai logo khác cỡ có thể cùng tâm nhưng mép ngoài ở các vị trí khác nhau.

| Cách tính vị trí | Ví dụ |
|---|---|
| **Giữ khoảng cách từ mốc** | Chọn **Trên trái** cho cả mốc artboard và neo đối tượng. Nếu góc logo mẫu cách trái 2 cm và cách trên 3 cm, góc các logo đích cũng sẽ ở vị trí đó trên từng trang. |
| **Giữ tỷ lệ theo artboard** | Neo nằm ở 25% chiều rộng và 20% chiều cao của trang mẫu sẽ nằm ở 25% chiều rộng và 20% chiều cao của từng trang đích. Phù hợp khi artboard khác khổ. |
| **Độ lệch nhập tay** | Chọn vị trí theo mốc artboard và nhập khoảng lệch, tính bằng cm. Giá trị ngang dương dịch sang phải. Giá trị dọc dương dịch xuống. Giá trị **0** đặt điểm neo ngay tại mốc theo chiều đó. |

Ví dụ căn logo giữa ngang và cách mép trên **2,5 cm**. Trên artboard mẫu, đặt logo đúng vị trí đó. Chọn **Trên giữa** cho cả **Mốc artboard** và **Điểm neo đối tượng**, rồi dùng **Giữ khoảng cách từ mốc**. Công cụ sẽ giữ khoảng cách 2,5 cm từ cạnh trên của từng artboard đến điểm giữa cạnh trên của logo.

## 3. Đồng bộ kích thước theo mẫu

Ví dụ logo mẫu **rộng 10 cm và cao 9 cm**. Công cụ hiển thị **Rộng 10 × Cao 9 cm**. Hai tab đồng bộ dùng chung mẫu trong cùng một tài liệu.

1. Chọn một logo rồi bấm **Lấy làm mẫu** trong **Đồng bộ kích thước**.
2. Giữ **Phạm vi → Đối tượng đang chọn** nếu muốn tự chọn đích. Quay lại artwork và chọn các logo đích, kể cả các logo trên cùng artboard với mẫu. Phạm vi này áp dụng trực tiếp lên lựa chọn. Để tìm tự động trên các artboard đích, chọn phạm vi artboard và chuẩn bị tên hoặc vai trò như ở mục 2.
3. Trong **Cách khớp kích thước**, chọn chế độ phù hợp. Muốn đích đúng cả hai chiều dù khác tỷ lệ, chọn **Khớp chính xác Rộng × Cao**.
4. Trong **Giữ điểm neo**, chọn điểm cần đứng yên trên từng logo đích. Với **Tâm**, logo sẽ lớn lên hoặc nhỏ đi quanh tâm hiện tại. Với **Trên trái**, góc trên trái giữ vị trí và các cạnh đối diện thay đổi.
5. Bấm **Xem kế hoạch**, kiểm tra chiều rộng và chiều cao trước, sau, rồi **Áp dụng**. Nếu cần lấy cả vị trí của mẫu, chạy **Đồng bộ vị trí** sau bước này.

| Cách khớp kích thước | Kết quả với mẫu 10 × 9 cm |
|---|---|
| **Rộng × Cao, giữ tỷ lệ** | Đây là lựa chọn mặc định. Ví dụ đích 20 × 18 cm sẽ về 10 × 9 cm. Đích 8 × 6 cm sẽ được báo khác tỷ lệ trong kế hoạch. |
| **Theo chiều rộng, giữ tỷ lệ** | Đích 8 × 6 cm sẽ thành 10 × 7,5 cm. |
| **Theo chiều cao, giữ tỷ lệ** | Đích 8 × 6 cm sẽ thành 12 × 9 cm. |
| **Khớp chính xác Rộng × Cao** | Đích 8 × 6 cm sẽ thành đúng 10 × 9 cm. Hình sẽ giãn khác nhau theo hai chiều. |

### Hình vector, nhóm và chữ còn chỉnh sửa

Toolkit đo chiều ngang và chiều cao của hình chữ nhật ôm quanh artwork theo đường hình học, chưa tính bề dày viền. Muốn đổi kích thước cả một cụm vector, chọn các thành phần rồi dùng **Object → Group**. Sau đó chọn cả nhóm làm mẫu hoặc đích. Toolkit lấy kích thước tổng thể của nhóm và đổi kích thước nhóm như một đối tượng. Với nhóm dùng mặt nạ clipping để giới hạn vùng hiển thị, chọn cả nhóm để đo theo mặt nạ.

Bạn có thể chọn khung chữ riêng hoặc nhóm gồm cả vector và chữ. Công cụ hỗ trợ **Point Text** (bấm để gõ) và **Area Text** (chữ nằm trong một vùng). Sau khi đồng bộ kích thước, chữ vẫn có thể chỉnh bằng **Type Tool (T)**. Những khung chữ chạy theo đường dẫn hoặc nối nội dung với một khung khác sẽ được báo giới hạn.

Ví dụ nhóm logo gồm biểu tượng và tên đơn vị. Chọn cả nhóm để đưa tổng thể về **10 × 9 cm**. Cỡ chữ có thể đổi theo mức thu phóng của nhóm. Nếu chọn **Khớp chính xác Rộng × Cao**, chữ cũng có thể giãn theo chiều ngang hoặc chiều dọc. Khi mục tiêu là đưa tên đơn vị về một giá trị như **30 pt**, dùng **Đổi cỡ chữ**.

## 4. Điền theo danh sách

1. Trên artboard mẫu, đặt nền, logo và các khung chữ ở vị trí mong muốn. Với biển gấp, chuẩn bị một khung cho mỗi mặt. Xoay sẵn khung của mặt quay ngược.
2. Dùng mũi tên đen **(V)** chọn khung chữ thứ nhất. Giữ **Shift** và bấm các khung chữ cần điền thêm trên cùng artboard. Nền và các đối tượng khác được lấy tự động từ artboard mẫu.
3. Mở **Điền theo danh sách** rồi dán nội dung bên dưới. Dấu **;** kết thúc một mục. Nhấn **Enter** để xuống dòng trong cùng một mục.

```text
CO-CHAIR
MALAYSIA;
CO-CHAIR
CHINA;
CHINA;
ASEAN
SECRETARIAT
```

Ví dụ này tạo bốn artboard mới. Biển đầu có hai dòng “CO-CHAIR” và “MALAYSIA” trong mỗi khung chữ đã chọn. Nếu bạn chọn hai khung cho biển gấp, cả hai mặt đều nhận hai dòng đó. Biển thứ ba chỉ có một dòng “CHINA” trên mỗi mặt.

4. Để **Tâm** nếu muốn tâm của từng khung chữ mới nằm ở cùng vị trí tương đối với artboard như mẫu. Có thể đổi số cột và khoảng cách giữa artboard để bố trí lưới. Các bản mới giữ kích thước của artboard mẫu.
5. Bấm **Xem trước** và kiểm tra số khung được chọn, định dạng chữ và nội dung từng biển. Bấm **Tạo artboard** để kiểm tra artwork rồi tạo các bản sao. Có thể dùng **Dừng sau nhóm này** trong panel nếu cần. Mỗi bản mới được đánh số và đặt tên theo nội dung.

Dùng khung chữ còn chỉnh sửa được. Trong từng khung, font, cỡ chữ và kiểu căn cần thống nhất. Các khung có thể dùng định dạng khác nhau và giữ góc xoay riêng. Chữ điểm giữ điểm neo đã chọn. Chữ vùng giữ nguyên kích thước và vị trí của khung. Khi tạo artboard, công cụ tự giảm cỡ của từng khung chữ được điền nếu nội dung vượt mép hoặc tràn khung chữ vùng. Chữ đã vừa giữ cỡ mẫu. Xem các bản được đánh dấu **Cần kiểm tra** nếu giảm cỡ vẫn không đủ. Với JSX, chọn các khung chữ trước khi mở hộp thoại.

Artboard mới sao chép artwork đang hiển thị thuộc artboard mẫu. Artwork đang nằm trên nhiều artboard cần được tách trước khi tạo. Nếu hình nền tràn lề, các trang mới được xếp có khoảng trống đủ để phần tràn của chúng không chồng nhau.

## Khi kế hoạch báo thiếu, trùng hoặc bị chặn

- **Thiếu.** Kiểm tra số artboard đích và tên hoặc vai trò của đối tượng. Tên trong bảng **Layers** có thể khác dòng chữ nhìn thấy trên artwork.
- **Trùng.** Hai hoặc nhiều đối tượng trên một artboard cùng khớp. Dùng **Chọn đối tượng** hoặc các nút chọn trong dòng kế hoạch để kiểm tra. Đổi tên hoặc vai trò của các mục thừa trước khi quét lại.
- **Bị chặn.** Đọc lý do ở dòng kế hoạch. Kiểm tra tỷ lệ trong tab kích thước, trạng thái khóa hoặc ẩn, nhóm clipping, hoặc đối tượng nằm qua ranh giới artboard.
- **Mẫu đã thay đổi.** Chọn lại đối tượng nguồn, bấm **Lấy làm mẫu** rồi xem kế hoạch mới. Thực hiện lại bước này khi chuyển sang một tài liệu khác.

Với **JSX dự phòng**, chọn đối tượng trong Illustrator trước khi mở **File → Scripts → Other Script**. Hộp thoại có cả bốn công cụ, và hai công cụ đồng bộ tìm đích theo artboard. Dùng panel CEP khi muốn lấy mẫu rồi đổi lựa chọn đích ngay trên cùng artboard.

[Cài đặt](INSTALL_VI.md) · [Ma trận tính năng](FEATURE_MATRIX.md)
