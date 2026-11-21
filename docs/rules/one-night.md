# Ma Sói Một Đêm: Luật chơi (One Night mode)

> Bộ luật gốc: **One Night Ultimate Werewolf** (ONUW), Ted Alspach & Akihisa Okui, Bezier Games.
> Tài liệu này **diễn giải lại bằng lời của dự án**, không sao chép rulebook. Mỗi luật có mã (ID) để code và test tham chiếu, ví dụ `// ON-VOTE-02`.

## Nguồn

| Mã       | Tài liệu                                                                                                                                                 | Ghi chú                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **[OR]** | _One Night Ultimate Werewolf_ rules, © 2015 Bezier Games. File `source/one night/ONUW_rules-updated_for_BGG.pdf`                                         | Luật vai, lời dẫn, thứ tự gọi. **Nguồn chính.**                                                        |
| **[OW]** | _ONUW Winning Conditions_ quick reference card, Bezier Games. File `source/one night/ONUW_3-up_WIN_Quick_Ref_Card.pdf`                                   | Điều kiện thắng và các luật hay bị quên                                                                |
| **[OQ]** | _ONUW_ roles quick reference card, Bezier Games. File `source/one night/ONUW_3-up_Quick_Ref_Card.pdf`                                                    | Tóm tắt vai                                                                                            |
| [FG]     | _One Night Ultimate Guide_ v1.0 (fan widbinjd, "created with the permission of Bezier Games"). File `source/one night/One_Night_Ultimate_Guide_v1.0.pdf` | Chỉ để tham khảo chéo                                                                                  |
| ❗ [GSG] | _ONUW Getting Started Guide_, **CHƯA CÓ**                                                                                                                | [OR] ghi rằng luật này đi cùng Getting Started Guide. Phần **chuẩn bị, thảo luận, vote** nằm trong đó. |
| **[AD]** | _App Decision_: quyết định của dự án                                                                                                                     | Tất cả đều là variant flag, có thể chỉnh                                                               |

> ⚠️ Các luật có 🔍 dưới đây được viết theo hiểu biết chung về ONUW, **chưa có nguồn chính thức**. Cần file [GSG] để xác minh.

---

## 1. Tổng quan

- **ON-CORE-01**: Mỗi người nhận vai Dân, Sói hoặc vai đặc biệt. Mục tiêu là tìm ra Sói và **giết được ít nhất 1 Sói**, trừ khi chính mình đã trở thành Sói. [OR tr.1]
- **ON-CORE-02**: Chỉ có **một đêm**, sau đó là **một lần thảo luận và một lần vote**. Không ai bị loại giữa chừng. [OR tr.5] (phần giới thiệu bản Nhật gốc)
- **ON-CORE-03**: Vai có thể **bị tráo trong đêm**. Vai và phe của bạn lúc cuối ván là **lá bài đang nằm trước mặt bạn**, không phải lá bạn nhận lúc đầu. [OR tr.4–5]

## 2. Chuẩn bị

- **ON-SETUP-01**: Luôn có **nhiều hơn số người chơi 3 lá**. 3 lá thừa đặt úp ở giữa bàn (**lá giữa**). [OR tr.2]
- **ON-SETUP-02**: Trước mỗi ván, công khai danh sách vai có trong ván, để mọi người biết những vai nào có thể xuất hiện. [OR tr.2]
  - [AD] App hiển thị danh sách này trên màn hình MacBook và trên điện thoại.
- **ON-SETUP-03**: Có thể dùng gần như bất kỳ tổ hợp vai nào. Nên chỉ thêm 1–2 vai mới mỗi lần để mọi người kịp làm quen. [OR tr.2]
- **ON-SETUP-04**: Nếu dùng Hội kín thì **phải có đủ cả 2 lá Hội kín**. [OR tr.4]
- **ON-SETUP-05**: Chỉ dùng Kẻ mất ngủ khi có Kẻ trộm và/hoặc Kẻ phá rối trong ván. [OR tr.5]
- 🔍 **ON-SETUP-06**: Mỗi người xem lá của mình một lần rồi úp xuống. **Sau đó không được xem lại** cho đến cuối ván. [GSG]
  - [AD] Trên điện thoại: chỉ được xem vai trong pha chia bài. Từ lúc bắt đầu đêm, vai bị ẩn.

## 3. Ban đêm

**Thứ tự gọi** [OR tr.6]. Chỉ gọi những vai có trong ván:

| #   | Vai                                | Hành động                                                                        | Bắt buộc? [OW] |
| --- | ---------------------------------- | -------------------------------------------------------------------------------- | -------------- |
| 1   | Kẻ sao chép (Doppelgänger)         | Xem lá của 1 người khác và **trở thành vai đó** (xem 5.3)                        | Tuỳ chọn       |
| 2   | Sói (Werewolf)                     | Các Sói mở mắt nhận mặt nhau. Không thấy ai thì các Sói còn lại đang ở giữa bàn. | **Bắt buộc**   |
| 3   | Tay sai (Minion)                   | Xem ai là Sói (Sói giơ ngón cái). Sói không biết ai là Tay sai.                  | (thức dậy)     |
| 4   | Hội kín (Mason)                    | Nhận mặt Hội kín còn lại. Không thấy thì lá kia ở giữa bàn.                      | **Bắt buộc**   |
| 5   | Tiên tri (Seer)                    | Xem **1 lá của người khác** hoặc **2 lá giữa**. Không di chuyển lá.              | Tuỳ chọn       |
| 6   | Kẻ trộm (Robber)                   | Đổi lá của mình với lá 1 người khác, rồi xem lá mới                              | Tuỳ chọn       |
| 7   | Kẻ phá rối (Troublemaker)          | Đổi lá của **2 người khác**, không xem                                           | Tuỳ chọn       |
| 8   | Bợm rượu (Drunk)                   | Đổi lá của mình với **1 lá giữa**, không xem                                     | **Bắt buộc**   |
| 9   | Kẻ mất ngủ (Insomniac)             | Xem lại lá của chính mình                                                        | Tuỳ chọn       |
| 9a  | Kẻ sao chép đã sao chép Kẻ mất ngủ | Xem lại lá của mình                                                              | Tuỳ chọn       |

- **ON-NIGHT-01**: Dân làng, Thợ thuộc da và Thợ săn **không bao giờ thức dậy** ban đêm. [OR tr.6]
- **ON-NIGHT-02**: Các hành động được thực hiện **tuần tự theo thứ tự trên**. Mỗi hành động tác động lên trạng thái lá bài _tại thời điểm đó_. [OR tr.6]
- **ON-NIGHT-03** (Sói đơn độc): Nếu **chỉ có 1 Sói** thức dậy, Sói đó được xem **1 lá giữa**. [OR tr.3] [OQ]
  - [OR] gọi đây là _option_, còn [OQ] ghi như luật chuẩn. [AD] Mặc định **bật**, có variant flag để tắt.
- **ON-NIGHT-04**: Kẻ trộm chỉ thức **một lần**, kể cả khi lấy được vai thức dậy muộn hơn. Kẻ trộm thuộc phe của lá vừa lấy, nhưng **không** thực hiện hành động của vai mới. [OR tr.4] [OW]
- **ON-NIGHT-05**: Nếu Kẻ trộm không đổi, Kẻ trộm vẫn là Kẻ trộm (phe Làng). Người nhận lá Kẻ trộm thuộc phe Làng. [OR tr.4]

**Cách app thực hiện [AD]**

- **Gọi mọi vai có trong danh sách**, kể cả khi lá đó đang nằm ở giữa bàn. Mỗi lượt có **thời lượng cố định**, để không ai suy ra được vai nào đang ở giữa (người dẫn thật cũng làm như vậy).
- **Ai cũng phải bấm điện thoại** trong suốt đêm; người không có lượt sẽ thấy một thao tác giả. Mục đích: không ai đoán được vai qua việc ai đang cầm máy.
- Hành động _bắt buộc_ (Bợm rượu) nếu hết giờ mà chưa chọn thì **app tự chọn ngẫu nhiên** một lá giữa.
- Kẻ trộm, Kẻ phá rối và Bợm rượu đổi lá trên **máy chủ**, không phát ra tiếng hay rung trên điện thoại ai.

## 4. Ban ngày và vote 🔍 (toàn bộ dựa vào [GSG], chưa có)

- 🔍 **ON-DAY-01**: Mọi người thức dậy và thảo luận. Được nói bất cứ điều gì, kể cả nói dối, nhưng **không được cho xem lá**.
  - [AD] Thời lượng thảo luận mặc định 5 phút, có thể chỉnh.
- 🔍 **ON-VOTE-01**: Hết giờ, **tất cả cùng lúc** chỉ vào một người (không được chỉ vào chính mình).
  - [AD] Trên app: mọi người chọn trên điện thoại, kết quả được công bố cùng lúc trên MacBook.
- 🔍 **ON-VOTE-02**: Người có **nhiều phiếu nhất** chết.
- 🔍 **ON-VOTE-03**: Nếu **hoà** thì **tất cả** những người hoà đều chết.
- 🔍 **ON-VOTE-04**: Nếu **không ai nhận quá 1 phiếu** thì không ai chết.
- **ON-VOTE-05** (Thợ săn): Nếu Thợ săn chết, người mà Thợ săn **đang chỉ (vote)** cũng chết, dù người đó nhận được bao nhiêu phiếu. [OR tr.5] [OQ]
- 🔍 **ON-END-01**: Sau khi công bố, tất cả lật lá đang ở trước mặt để xác định phe và người thắng.

## 5. Vai

### 5.1 Vai MVP cho chế độ Một Đêm

| ID             | Vai          | EN           | Phe   | Luật                                                                                       |
| -------------- | ------------ | ------------ | ----- | ------------------------------------------------------------------------------------------ |
| `villager`     | Dân làng     | Villager     | Làng  | Không có khả năng; chắc chắn không phải Sói. [OR tr.5]                                     |
| `werewolf`     | Sói          | Werewolf     | Sói   | ON-NIGHT-03. [OR tr.3]                                                                     |
| `minion`       | Tay sai      | Minion       | Sói   | Thấy Sói, Sói không thấy Tay sai. Xem điều kiện thắng ở mục 6. [OR tr.3]                   |
| `mason`        | Hội kín      | Mason        | Làng  | Luôn có đủ 2 lá. [OR tr.4]                                                                 |
| `seer`         | Tiên tri     | Seer         | Làng  | Xem 1 lá người khác **hoặc** 2 lá giữa. [OR tr.4]                                          |
| `robber`       | Kẻ trộm      | Robber       | Làng* | ON-NIGHT-04/05. [OR tr.4]                                                                  |
| `troublemaker` | Kẻ phá rối   | Troublemaker | Làng  | Đổi lá 2 người **khác**, không xem; người nhận lá mới mang vai và phe của lá đó. [OR tr.4] |
| `drunk`        | Bợm rượu     | Drunk        | Làng* | **Bắt buộc** đổi với 1 lá giữa, không xem; trở thành vai mới. [OR tr.5]                    |
| `insomniac`    | Kẻ mất ngủ   | Insomniac    | Làng  | Xem lại lá của mình cuối đêm. [OR tr.5]                                                    |
| `hunter`       | Thợ săn      | Hunter       | Làng  | ON-VOTE-05. [OR tr.5]                                                                      |
| `tanner`       | Thợ thuộc da | Tanner       | Riêng | Chỉ thắng nếu chính mình chết. [OR tr.5]                                                   |

\* Phe thay đổi theo lá nhận được.

### 5.2 Hướng dẫn trong luật về việc chọn vai [OR tr.2]

- Có thể thử ván chỉ có 1 Sói, hoặc chia ngẫu nhiên toàn bộ lá, hoặc làm một làng không có lá Dân làng nào.
- Đừng lo nếu một phe có vẻ thắng quá nhiều; lối chơi sẽ tự cân bằng dần sau vài ván.

### 5.3 Kẻ sao chép (Doppelgänger): giai đoạn sau

Vai phức tạp nhất. Luật đầy đủ ở [OR tr.2–3]. Tóm tắt:

- Thức dậy **đầu tiên**, xem lá của 1 người khác và trở thành vai đó, thuộc phe của vai đó.
- Nếu sao chép **Dân làng, Thợ thuộc da hoặc Thợ săn**: không làm gì thêm.
- Nếu sao chép **Sói hoặc Hội kín**: thức dậy cùng nhóm đó khi được gọi.
- Nếu sao chép **Tiên tri, Kẻ trộm, Kẻ phá rối hoặc Bợm rượu**: thực hiện hành động **ngay lập tức** và không thức lại khi vai gốc được gọi.
- Nếu sao chép **Tay sai**: Sói giơ ngón cái cho Kẻ sao chép xem.
- Nếu sao chép **Kẻ mất ngủ**: thức dậy sau Kẻ mất ngủ để xem lại lá của mình (lượt #9a).
- **Vai mà Kẻ sao chép xem được đi theo lá Kẻ sao chép.** Ai cuối ván cầm lá Kẻ sao chép thì mang vai mà Kẻ sao chép ban đầu đã xem. [OR tr.2] [OW]

## 6. Điều kiện thắng [OW] [OR]

Xét theo **lá đang ở trước mặt mỗi người lúc cuối ván**.

- **ON-WIN-01** (phe Làng): Thắng nếu **ít nhất 1 Sói chết**, kể cả khi có người phe Làng cũng chết. [OW]
- **ON-WIN-02** (phe Làng, không có Sói): Nếu **không ai trong số người chơi là Sói**, phe Làng chỉ thắng khi **không ai chết**, kể cả Thợ thuộc da hay Tay sai. [OW]
- **ON-WIN-03** (Sói): Thắng nếu **không Sói nào chết**. Nếu có Thợ thuộc da trong ván, Sói chỉ thắng khi không Sói nào chết **và Thợ thuộc da còn sống**. [OW]
- **ON-WIN-04** (Tay sai): Thắng cùng Sói, kể cả khi chính mình chết. Nếu **không ai là Sói**, Tay sai thắng khi **có người khác chết** và bản thân Tay sai còn sống (và Thợ thuộc da còn sống). [OW] [OR tr.3]
- **ON-WIN-05** (Thợ thuộc da): Thắng nếu chính mình chết. [OW]
  - Thợ thuộc da chết và không Sói nào chết: **Sói không thắng**.
  - Thợ thuộc da chết và có Sói cũng chết: **phe Làng cũng thắng**.
  - Thợ thuộc da chết khi mọi Sói đều ở giữa bàn: **phe Làng thua**. [OR tr.5]
- Có thể có **nhiều phe cùng thắng** (ví dụ Thợ thuộc da và phe Làng). App phải hiển thị danh sách **tất cả người thắng**, không chỉ một phe.

**Test bắt buộc** [AD]: mỗi tình huống ở trên phải có ít nhất 1 test kịch bản. Bao gồm: không có Sói nào trong số người chơi; Thợ thuộc da chết cùng Sói; Thợ săn kéo theo Sói; hoà phiếu 3 người; mọi người đều chỉ 1 phiếu.

## 7. Preset cho 8–10 người [AD]

[OR] không đưa bảng preset, còn bảng gợi ý của [GSG] thì chưa có. Bộ dưới đây do dự án đề xuất, dùng **đúng 16 lá có trong hộp ONUW gốc** [OR tr.1]: Kẻ sao chép, 2 Sói, Tay sai, 2 Hội kín, Tiên tri, Kẻ trộm, Kẻ phá rối, Bợm rượu, Kẻ mất ngủ, Thợ săn, Thợ thuộc da, 3 Dân làng.

| Người | Tổng lá | Bộ vai                                                                                                            |
| ----- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| 8     | 11      | 2 Sói, Tay sai, Tiên tri, Kẻ trộm, Kẻ phá rối, Bợm rượu, Kẻ mất ngủ, Thợ săn, 2 Dân làng                          |
| 9     | 12      | Bộ 8 người + Thợ thuộc da                                                                                         |
| 10    | 13      | 2 Sói, Tay sai, 2 Hội kín, Tiên tri, Kẻ trộm, Kẻ phá rối, Bợm rượu, Kẻ mất ngủ, Thợ săn, Thợ thuộc da, 1 Dân làng |

---

## 7b. Trong app (M3) [AD]

- Ai cũng có thao tác để bấm trong mọi lượt đêm (ON-NIGHT, chống đoán vai). Người không có vai trong lượt đó được hỏi "Bạn nghi ai là Sói?".
- Mỗi lượt gọi kéo dài **12 giây**, kể cả vai đang nằm ở giữa bàn.
- Bợm rượu không chọn kịp thì app chọn ngẫu nhiên một lá giữa ([OW]: bắt buộc).
- Thảo luận: mặc định 5 phút (chủ phòng chỉnh 1–15 phút). Chủ phòng có thể chuyển sang bỏ phiếu sớm. Bỏ phiếu: 30 giây, kết thúc sớm khi tất cả đã chọn.
- Kẻ sao chép (Doppelgänger) **chưa có** trong app.

## 8. Việc còn mở

- ❗ **Cần file Getting Started Guide** của ONUW để xác minh toàn bộ mục 4 (thảo luận, vote, hoà, "không ai quá 1 phiếu") và bảng bộ vai gợi ý chính thức.
- 🔍 Thời lượng mỗi lượt đêm (luật gốc dựa vào app của Bezier). Tạm đặt khoảng 10 giây mỗi vai, cấu hình được.
- Kẻ sao chép làm sau cùng (M4 trở đi).
