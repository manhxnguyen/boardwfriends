# Ma Sói Cổ điển: Luật chơi (Classic mode)

> Bộ luật gốc: **Ultimate Werewolf**, Bezier Games, phiên bản tài liệu 2021.
> Tài liệu này **diễn giải lại bằng lời của dự án**, không sao chép rulebook. Mỗi luật có mã (ID) để code và test tham chiếu, ví dụ `// UW-VOTE-03`.

## Nguồn

| Mã       | Tài liệu                                                                                                                   | Ghi chú                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **[GS]** | _Ultimate Werewolf: Getting Started_, v1.1, © 2021 Bezier Games. File `source/ultimate/UW4_online_Getting_Started_1.1.pdf` | Luật cơ bản. **Nguồn chính.**                                                                                              |
| **[RR]** | _Ultimate Werewolf: Role Reference_, v1.1, © 2021 Bezier Games. File `source/ultimate/UWSE_online_Role_Reference_1.1.pdf`  | Điểm của từng vai và các làm rõ (clarification)                                                                            |
| [JK]     | Bìa hộp "Small Box Game Jacket" do fan làm (Boardgame Barrio, 2024), file `SBG_Jacket_-_Ultimate_Werewolf.pdf`             | **Không phải luật.** Chỉ dùng để đọc phần chữ trên lá bài lộ ra trong ảnh bộ Deluxe Edition.                               |
| [S1]     | _Ultimate Werewolf: Ultimate Edition_ rulebook, bản chép lại tại rulespal.com (edition cũ)                                 | Chỉ dùng khi [GS]/[RR] không đề cập. Luôn ghi chú "edition cũ".                                                            |
| **[AD]** | _App Decision_: quyết định của dự án                                                                                       | Dùng ở những chỗ luật gốc dựa vào quản trò người thật, nên app phải tự quy định. Tất cả đều là variant flag, có thể chỉnh. |

> ⚠️ Các file PDF có bản quyền ("không được sao chép hay đăng lại khi chưa được phép", [GS] tr.4). Thư mục `source/` **không được commit** lên git (đã thêm vào `.gitignore`).

---

## 1. Tổng quan

- **UW-CORE-01**: Có 2 phe: **phe Làng** và **phe Sói**. Phe Làng không biết ai là Sói; Sói tìm cách ẩn mình và loại dần từng người phe Làng. [GS tr.1]
- **UW-CORE-02**: Game diễn ra xen kẽ **Ngày** và **Đêm**. Ban ngày cả làng thảo luận và vote loại một người. Ban đêm Sói chọn một người để loại, còn Tiên tri soi một người xem có phải Sói không. [GS tr.1]
- **UW-CORE-03**: Có một quản trò đứng ngoài, không thuộc phe nào. Trong app, quản trò là **máy chủ (Durable Object) + màn hình quản trò trên MacBook**. [GS tr.1] [AD]

## 2. Chuẩn bị

- **UW-SETUP-01** (bộ cơ bản cho ván đầu): 1 Tiên tri; Sói: **1 lá với 6–8 người, 2 lá với 9–11 người, 3 lá với 12–15 người**; còn lại là Dân làng. [GS tr.1]
- **UW-SETUP-02**: Mỗi người nhận 1 lá úp và xem bí mật, không để lộ cho ai. [GS tr.1]
- **UW-SETUP-03**: Từ lúc chia bài đến hết đêm đầu, **chỉ quản trò được nói**. [GS tr.1]
- **UW-SETUP-04** (cân bằng): Mỗi vai có một con số thể hiện mức ảnh hưởng tới phe Làng. Khi chọn bộ vai, cố gắng để **tổng điểm càng gần 0 càng tốt**; số dương có lợi cho phe Làng, số âm có lợi cho phe Sói. [RR tr.2]
- **UW-SETUP-05**: Không bao giờ được cho người khác xem lá bài của mình. Được phép **nói** bất cứ điều gì, kể cả nói dối. [GS tr.2]

## 3. Đêm đầu tiên

- **UW-N1-01**: Cả làng nhắm mắt ngủ. [GS tr.2]
- **UW-N1-02**: Sói mở mắt **nhận mặt nhau**. Đêm đầu Sói **không loại ai**. [GS tr.2] _(Phòng có thể bật tuỳ chọn "Sói cắn từ đêm đầu", xem AD-AUTO-12.)_
- **UW-N1-03**: Tiên tri chỉ vào 1 người; quản trò báo người đó **có phải Sói hay không**. [GS tr.2]
- **UW-N1-04**: Dân làng không thức dậy ban đêm. [GS tr.2]
- **UW-N1-05** [AD] ✅ _(chốt 21/11)_: Đêm đầu **vẫn gọi đủ mọi vai có hành động đêm** (Bảo vệ, Phù thuỷ, Thầy phép…), dù Sói không giết. Mục đích là không để lộ vai qua việc ai đang bấm điện thoại. Lựa chọn của Bảo vệ và Phù thuỷ trong đêm này không có tác dụng, nên **không tính** là đã dùng lượt (Bảo vệ không bị cấm chọn lại người đó ở đêm 2; Phù thuỷ không mất lượt dùng duy nhất). Phù thuỷ được báo "đêm nay không ai bị nhắm". 🔍 Phù thuỷ **cũng không được giết** ở đêm đầu, để giữ đúng tinh thần "đêm đầu không ai bị loại" của [GS tr.2] (bản cơ bản chỉ gọi Sói và Tiên tri ở đêm đầu). Thầy phép được chọn người bị câm ngày 1 hay không: ❓ cần chốt.

## 4. Ban ngày

- **UW-DAY-01**: Đầu mỗi ngày (từ ngày 2), quản trò công bố người bị loại trong đêm và **lật bài** người đó cho mọi người xem. [GS tr.3]
- **UW-DAY-02** (ngày đầu): Lần lượt từng người giới thiệu bản thân. Người có vai đặc biệt nên nhận mình là Dân làng. [GS tr.2]
- **UW-DAY-03** (giới hạn thời gian): Quản trò đặt trước thời lượng cho ngày (ví dụ 5 phút). Hết giờ mà chưa loại được ai thì làng **đi ngủ ngay**. Phải báo trước khi sắp hết giờ. [GS tr.3]
  - [AD] [GS] chỉ nói rõ cho ngày đầu; app áp dụng giới hạn cho **mọi ngày**, cấu hình riêng: ngày 1 mặc định 5 phút, các ngày sau mặc định 5 phút.
- **UW-DAY-04**: Người đã bị loại **không được nói gì nữa**, phải rời vòng tròn nhưng có thể ngồi xem. [GS tr.3–4]

## 5. Đề cử và vote

- **UW-VOTE-01**: Đề cử một người bằng cách chỉ vào họ và nói "Tôi đề cử X". [GS tr.3]
- **UW-VOTE-02**: Cần **một người khác ủng hộ (second)** thì lời đề cử mới có hiệu lực. [GS tr.3]
- **UW-VOTE-03**: Người bị đề cử được **tự bào chữa**, sau đó cả làng vote: giữ lại hoặc loại. [GS tr.3]
- **UW-VOTE-04**: Nếu **hơn một nửa số người chơi** vote loại, người đó bị loại và bị lật bài. [GS tr.3]
  - [AD] "Số người chơi" được hiểu là **số người còn sống**, vì người đã bị loại không được tham gia. Người bị đề cử **vẫn được vote**.
  - Ví dụ: còn 7 người sống thì cần ≥ 4 phiếu loại.
- **UW-VOTE-05**: Có người bị loại thì làng **đi ngủ ngay**. Không đủ phiếu thì tiếp tục thảo luận cho đến lần đề cử tiếp theo. [GS tr.3]
- **UW-VOTE-06**: Vote là quyết định có/không cho từng người một, nên **không có trường hợp hoà giữa hai người**. [GS tr.3]

**Cách app thực hiện [AD]:**

- Đề cử: bấm vào tên người trên điện thoại.
- Ủng hộ: người khác bấm "Ủng hộ" trong vòng 15 giây; không ai ủng hộ thì lời đề cử bị huỷ.
- Bào chữa: đếm ngược theo cài đặt của phòng (1 đến 5 phút, mặc định 1 phút), người bị đề cử nói trực tiếp.
- Vote: mọi người bấm 👍 giữ hoặc 👎 loại **cùng lúc**. Kết quả (ai vote gì) hiện **công khai** trên màn hình MacBook, giống việc giơ ngón cái ngoài đời.
- Các thời lượng trên đều là variant flag.

## 6. Các đêm tiếp theo

- **UW-NIGHT-01**: Sói chọn 1 người để loại; **tất cả Sói phải đồng ý**. [GS tr.3] [RR tr.3]
- **UW-NIGHT-02**: Nếu Sói mất **quá 30 giây** mà chưa thống nhất, Sói đi ngủ và **đêm đó không loại ai**. [RR tr.3]
  - [AD] App dùng mặc định 30 giây (có thể chỉnh). Trên điện thoại, mỗi Sói thấy lựa chọn của đồng đội theo thời gian thực.
- **UW-NIGHT-03**: Sói **được phép chọn một Sói khác** làm mục tiêu. [RR tr.3]
- **UW-NIGHT-04**: Sau đó Tiên tri soi 1 người. [GS tr.3]
- **UW-NIGHT-05** (thứ tự gọi vai) 🔍: [GS] và [RR] không nêu thứ tự đầy đủ. Tạm dùng thứ tự theo [S1] (edition cũ): **Bảo vệ → Sói (kể cả Sói con) → Phù thuỷ → Tiên tri → Phù thuỷ tà (Sorceress) → Thầy phép (Spellcaster) → Kẻ mất ngủ (Insomniac)**.
  - [AD] Kẻ mất ngủ được xếp cuối, vì vai này cần biết ai đã thức trong đêm.

## 7. Kết thúc

- **UW-END-01**: **Phe Làng thắng** khi tất cả Sói đã bị loại. [GS tr.1, tr.4]
- **UW-END-02**: **Phe Sói thắng** khi số Sói **≥** số người phe Làng, tức là Sói không thể bị vote loại vào ban ngày nữa. [GS tr.1, tr.4]
  - Đây là luật chuẩn của bản 2021, không phải tuỳ chọn. Bản cũ [S1] ghi là quản trò "có thể" tuyên bố.
- **UW-END-03**: Phe độc lập (Thợ thuộc da, Chupacabra) có điều kiện thắng riêng. Khi họ thắng thì **mọi người khác đều thua**. [RR tr.2–3]
- **UW-END-04**: Kết thúc ván, tất cả người còn lại lật bài. [GS tr.4]
- [AD] App kiểm tra điều kiện thắng **sau mỗi lần có người bị loại**, kể cả người bị loại do Thợ săn bắn hoặc Phù thuỷ.

---

## 8. Vai

Điểm lấy từ lá bài trong [RR] tr.1 (in trên cột rào của mỗi lá). Màu cột rào thể hiện phe [RR tr.2]: xanh đậm = Dân thường, xanh nhạt = hỗ trợ phe Làng, đỏ đậm = Sói, hồng = hỗ trợ phe Sói, nâu = độc lập.

### 8.1 Vai MVP (giai đoạn 1)

| ID          | Vai      | EN        | Phe  | Điểm   | Luật                                                                                                                                                                                                                                                                                                                                          |
| ----------- | -------- | --------- | ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `villager`  | Dân làng | Villager  | Làng | **+1** | **UW-R-VIL-01**: Không thức dậy ban đêm, không có khả năng đặc biệt. [RR tr.3]                                                                                                                                                                                                                                                                |
| `werewolf`  | Sói      | Werewolf  | Sói  | **−6** | Xem UW-NIGHT-01..03. [RR tr.3]                                                                                                                                                                                                                                                                                                                |
| `seer`      | Tiên tri | Seer      | Làng | **+7** | **UW-R-SEER-01**: Mỗi đêm soi 1 người. Kết quả là "là Sói" hoặc "không phải Sói". **Chỉ phát hiện Sói**, không biết vai cụ thể. [GS tr.2] [RR tr.3]                                                                                                                                                                                           |
| `bodyguard` | Bảo vệ   | Bodyguard | Làng | **+3** | **UW-R-BG-01**: Mỗi đêm chọn 1 người; người đó **không thể bị loại trong đêm đó**. (Chữ trên lá bài bị che trong [RR] tr.1, nhưng đọc được trên lá Bodyguard ở ảnh bộ Deluxe [JK] tr.3.) **UW-R-BG-02**: **Không được bảo vệ cùng một người 2 đêm liền**, và **không được tự bảo vệ mình**. [RR tr.2]                                         |
| `hunter`    | Thợ săn  | Hunter    | Làng | **+3** | **UW-R-HUN-01**: Khi bị loại, được loại ngay 1 người khác. **UW-R-HUN-02**: Nếu bị loại ban đêm, Thợ săn được báo vào sáng hôm sau và bắn lúc đó; **không ai được nói** cho đến khi Thợ săn quyết định. [RR tr.3]                                                                                                                             |
| `witch`     | Phù thuỷ | Witch     | Làng | **+4** | **UW-R-WIT-01**: Quản trò cho Phù thuỷ biết (những) người bị nhắm loại đêm đó. Phù thuỷ **chọn MỘT trong hai**: cứu 1 người trong số đó, **hoặc** chọn 1 người mới để loại. **UW-R-WIT-02**: Dùng xong một trong hai khả năng thì **không còn được biết** ai bị nhắm loại các đêm sau, tức là **chỉ dùng được 1 lần trong cả ván**. [RR tr.4] |

> ⚠️ **Khác với bản nháp cũ và với bản Ma Sói Pháp:** Phù thuỷ của Ultimate Werewolf 2021 **chỉ có 1 lần dùng duy nhất** (cứu _hoặc_ giết), không phải 2 bình thuốc riêng.

**Tương tác cần chốt [AD]:**

- Bảo vệ và Phù thuỷ cùng cứu một người: người đó sống. Phù thuỷ vẫn bị tính là đã dùng lượt, vì Phù thuỷ không biết Bảo vệ đã cứu.
- Bảo vệ có chặn được việc Phù thuỷ giết không? 🔍 Theo cách hiểu "không thể bị loại trong đêm đó" thì **có**. Tạm theo cách hiểu này.
- Thợ săn bị Phù thuỷ loại ban đêm: vẫn được bắn vào sáng hôm sau, theo UW-R-HUN-02.

### 8.2 Vai giai đoạn 2 (có trong bộ bài [RR])

| ID              | Vai          | EN            | Phe        | Điểm   | Luật tóm tắt                                                                                                                                                                                                                                                         |
| --------------- | ------------ | ------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wolf-cub`      | Sói con      | Wolf Cub      | Sói        | **−8** | Thức dậy cùng Sói và chọn mục tiêu cùng Sói. Nếu Sói con bị loại, **đêm sau Sói được loại 2 người**. [RR tr.1–2, tr.4]                                                                                                                                               |
| `sorceress`     | Phù thuỷ tà  | Sorceress     | hỗ trợ Sói | **−3** | Mỗi đêm tìm Tiên tri: quản trò báo người được chỉ **có phải Tiên tri không**. Không biết ai là Sói. [RR tr.3]                                                                                                                                                        |
| `tanner`        | Thợ thuộc da | Tanner        | Độc lập    | **−2** | Thắng nếu bị loại; khi đó mọi người khác thua. [RR tr.3] (Bản cũ [S1] ghi +1; bản 2021 ghi **−2**.)                                                                                                                                                                  |
| `village-idiot` | Thằng ngốc   | Village Idiot | Làng       | **+2** | **Luôn vote loại.** Người chơi không nên biết chắc vai này có trong ván hay không. [RR tr.1, tr.3]                                                                                                                                                                   |
| `spellcaster`   | Thầy phép    | Spellcaster   | Làng       | **+1** | Mỗi đêm chọn 1 người; người đó **không được nói** vào ngày hôm sau. Không được chọn cùng một người 2 lần trong cả ván. Quản trò công bố người bị câm đầu ngày. [RR tr.3]                                                                                             |
| `insomniac`     | Kẻ mất ngủ   | Insomniac     | Làng       | **+1** | Mỗi đêm biết **ít nhất 1 trong 2 người ngồi cạnh** có thức dậy hay không (không biết là 1 hay 2 người). Nếu một người ngồi cạnh bị loại ban đêm, xét người đó chứ không xét người bên cạnh tiếp theo. [RR tr.3] **Cần thứ tự chỗ ngồi**: app phải cho xếp vòng tròn. |
| `mason`         | Hội kín      | Mason         | Làng       | **+2** | Các Hội kín biết mặt nhau. **Không ai được nhắc tới Hội kín**, dù trực tiếp hay gián tiếp; ai nhắc sẽ bị loại đêm đó. [RR tr.3] Luật này cần quản trò người thật phán xử, nên app chỉ hỗ trợ bằng nút "phạt" cho host.                                               |
| `chupacabra`    | Chupacabra   | Chupacabra    | Độc lập    | **+4** | Phải bị loại thì các phe khác mới thắng được; thắng khi mọi người khác đều bị loại. [RR tr.3] 🔍 Chữ trên lá bài bị che, không rõ khả năng ban đêm. Cần lá bài thật.                                                                                                 |

---

## 9. Preset cho 8–10 người

**Bộ cơ bản chính thức** [GS tr.1]:

| Số người | Bộ vai                   | Tổng điểm          |
| -------- | ------------------------ | ------------------ |
| 8        | 1 Sói, 1 Tiên tri, 6 Dân | −6 +7 +6 = **+7**  |
| 9        | 2 Sói, 1 Tiên tri, 6 Dân | −12 +7 +6 = **+1** |
| 10       | 2 Sói, 1 Tiên tri, 7 Dân | −12 +7 +7 = **+2** |

**Bộ gợi ý dùng vai MVP** [AD]: tự tính theo điểm [RR], **không phải preset chính thức**.

| Số người                  | Bộ vai                                                     | Tổng điểm                                     |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| 8                         | 2 Sói, Tiên tri, Bảo vệ, 4 Dân                             | −12 +7 +3 +4 = **+2**                         |
| 9                         | 2 Sói, Tiên tri, Bảo vệ, Thợ săn, 4 Dân                    | −12 +7 +3 +3 +4 = **+5**                      |
| 9 (cân hơn, giai đoạn 2)  | 2 Sói, Phù thuỷ tà, Tiên tri, Phù thuỷ, Thợ săn, 3 Dân     | −12 −3 +7 +4 +3 +3 = **+2**                   |
| 10                        | 2 Sói, Tiên tri, Bảo vệ, Phù thuỷ, Thợ săn, 4 Dân          | −12 +7 +3 +4 +3 +4 = **+9** (nghiêng về Làng) |
| 10 (cân hơn, giai đoạn 2) | 2 Sói, Sói con, Tiên tri, Bảo vệ, Phù thuỷ, Thợ săn, 3 Dân | −12 −8 +7 +3 +4 +3 +3 = **0**                 |

---

## 9b. Chế độ app tự dẫn (M2): các quyết định của app [AD]

Luật gốc dựa vào quản trò người thật. Khi app làm quản trò, những chỗ sau được quy định như dưới đây. Mọi quyết định đều có test trong `packages/engine/test/classic-game.test.ts`.

| Mã         | Quyết định                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AD-AUTO-01 | Ban đêm mọi người **cúi xuống điện thoại của mình** thay cho nhắm mắt. Mỗi lượt gọi có **thời lượng cố định** (Sói 30 giây theo [RR tr.3], Phù thuỷ 20 giây, các vai khác 15 giây), kể cả khi vai đã chết hoặc đã bấm xong, để không ai đoán được vai qua thời gian.                                                                                                                                                                                                                                                                                                         |
| AD-AUTO-02 | Trong mỗi lượt đêm, **người không có việc gì làm** sẽ được hỏi "Bạn nghi ai là Sói?". Ai cũng bấm, nên không đoán được vai qua việc ai đang cầm máy. Câu trả lời được dùng cho thống kê cuối ván. Sói ở đêm đầu cũng nhận câu hỏi này, kèm danh sách bầy.                                                                                                                                                                                                                                                                                                                    |
| AD-AUTO-03 | Sói chọn trên điện thoại và thấy lựa chọn của đồng đội theo thời gian thực. Nạn nhân là người được **tất cả Sói còn sống chọn trùng nhau** khi hết giờ; nếu không trùng thì không ai chết (UW-NIGHT-01/02). Điện thoại Sói hiện ai đã được đồng đội chọn, nút "Chọn giống <tên>" và trạng thái đã trùng hay chưa. Phòng có thể bật chọn theo đa số (AD-AUTO-14).                                                                                                                                                                                                             |
| AD-AUTO-04 | Bảo vệ chặn được cả lượt giết của Phù thuỷ ("không thể bị loại trong đêm đó", UW-R-BG-01). Phù thuỷ chọn "không làm gì" thì không mất lượt dùng.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| AD-AUTO-05 | Thợ săn có 30 giây để bắn. Hết giờ thì coi như bắn lên trời.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| AD-AUTO-06 | Đề cử: cần người khác **ủng hộ trong 15 giây**; bào chữa **chủ phòng chọn từ 1 đến 5 phút, mặc định 1 phút** (luật gốc không quy định thời lượng [GS tr.3]; chủ phòng vẫn có thể bỏ qua để bỏ phiếu ngay; người dẫn truyện đọc số giây; **còn 10 giây** thì người dẫn truyện nói "Còn 10 giây!", mọi màn hình đếm ngược 10 → 1 và điện thoại rung một lần); bỏ phiếu 20 giây, kết thúc sớm nếu mọi người đã bỏ phiếu. Phiếu được tính trên **số người còn sống** (UW-VOTE-04). Đồng hồ thảo luận **tạm dừng** trong lúc đề cử; nếu đề cử thất bại thì còn tối thiểu 20 giây. |
| AD-AUTO-07 | Người bị Thầy phép yểm bùa **không được đề cử và không được ủng hộ** (vì đó là "nói"), nhưng vẫn được bỏ phiếu.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| AD-AUTO-08 | Đề cử và ủng hộ **bằng giọng nói** (qua MacBook) được ghi là "có người". Lý do: nhận dạng giọng nói không biết ai đang nói.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| AD-AUTO-09 | Kiểm tra điều kiện thắng sau mỗi lần có người bị loại, **sau khi Thợ săn đã bắn**. Thợ thuộc da bị loại thì ván kết thúc ngay (RR-TANNER).                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| AD-AUTO-10 | Thứ tự chỗ ngồi do chủ phòng xếp trước khi chia bài; Kẻ mất ngủ dùng thứ tự này để xác định 2 người ngồi cạnh (bỏ qua người đã chết, [RR tr.3]).                                                                                                                                                                                                                                                                                                                                                                                                                             |
| AD-AUTO-11 | Người chơi rời phòng giữa ván **vẫn giữ chỗ** trong ván (không tự động bị loại). Chủ phòng có thể bắt đầu ván mới.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| AD-AUTO-12 | **Tuỳ chọn "Sói cắn từ đêm đầu"** (chốt 21/11/2026 theo yêu cầu của nhóm, **bật sẵn**). Khi bật: đêm 1 Sói vẫn nhận mặt nhau nhưng được chọn nạn nhân, Bảo vệ và Phù thuỷ có tác dụng như mọi đêm (thay cho UW-N1-02 và UW-N1-05). Khi tắt: đúng luật gốc [GS tr.2], đêm đầu không ai bị loại. Áp dụng cho cả app tự dẫn lẫn kịch bản của quản trò người thật.                                                                                                                                                                                                               |
| AD-AUTO-13 | **Sói con chết: chỉ Sói biết đêm sau được loại 2 người.** Luật chỉ nói Sói được loại 2 người [RR tr.4]; ngoài đời quản trò báo riêng lúc Sói đang mở mắt. App **không đọc to và không hiện trên phụ đề chung** số nạn nhân; chỉ điện thoại của Sói còn sống báo “được loại 2 người” và cho chọn 2. Lý do: nếu ván không lật bài người chết, câu đọc to sẽ lộ ra người vừa chết là Sói con, và phe Làng không nên biết đêm nay nguy hiểm hơn. Tương tự, việc Phù thuỷ đã dùng hết thuốc chỉ hiện trên máy Phù thuỷ.                                                           |
| AD-AUTO-14 | **Tuỳ chọn "Sói chọn theo đa số"** (thêm 27/11/2026 theo yêu cầu của nhóm, **tắt sẵn**; chỉ ở chế độ app tự dẫn). Luật gốc bắt cả bầy chọn trùng nhau, quá 30 giây thì không ai chết (UW-NIGHT-01/02). Trên điện thoại Sói khó ra hiệu cho nhau, nên khi bật: hết giờ, người được **nhiều Sói chọn nhất** bị cắn; **hoà thì app bốc ngẫu nhiên** một người trong số đó (với 2 Sói chọn 2 người khác nhau, mỗi người 50%). Đêm Sói con chết thì lấy 2 người được chọn nhiều nhất. Bảo vệ và Phù thuỷ vẫn có tác dụng như thường.                                              |

## 10. Việc còn mở

- 🔍 Chữ đầy đủ trên lá bài của **Chupacabra, Thợ thuộc da, Phù thuỷ, Kẻ mất ngủ, Thầy phép** (bị che trong PDF tr.1). Cần ảnh chụp lá bài thật, hoặc PDF bản đầy đủ.
- 🔍 Thứ tự gọi vai ban đêm theo bản 2021. Tài liệu có nói app _Ultimate Werewolf Extreme_ của Bezier tự lo phần này [RR tr.2], nhưng không in ra thứ tự.
- 🔍 Sói con có bị Tiên tri soi ra "là Sói" không? Sói con thuộc phe Sói và thức cùng Sói [RR tr.2], nên khả năng cao là **có**. Tạm theo cách này.
- Luật chế độ Một Đêm: xem [one-night.md](one-night.md).
