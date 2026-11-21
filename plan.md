# boardwfriends: Kế hoạch (bản nháp để thảo luận)

> Trạng thái: **DRAFT v0.2**. Chưa implement. Các mục có dấu ❓ là câu hỏi mở, cần chốt cùng nhau.
> Cập nhật: 2026-11-21

## Bản đang chạy

**https://boardwfriends.bwf-web.workers.dev** (Cloudflare Workers, gói miễn phí; deploy bằng `pnpm cf:deploy`).

## Các quyết định đã chốt

| Ngày  | Quyết định                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21/11 | Không làm voice chat. **MacBook** làm máy quản trò: phát giọng dẫn và hiển thị màn hình chung.                                                                                              |
| 21/11 | Khu cắm trại **có wifi ổn định**, nên **Cloudflare** là phương án chính. Bản offline/LAN xuống cuối danh sách.                                                                              |
| 21/11 | Bỏ Rails, dùng **TypeScript + Svelte 5 + Cloudflare Workers/Durable Objects**. Đã viết lại [instructions.md](instructions.md) và [architecture_guidelines.md](architecture_guidelines.md).  |
| 21/11 | Luật chơi theo **dòng Ma Sói phổ biến nhất ở Mỹ**: _Ultimate Werewolf_ và _One Night Ultimate Werewolf_ (Bezier Games), đang bán tại Walmart và Target.                                     |
| 21/11 | Hình thẻ bài: bạn tự tạo theo spec trong [docs/art-spec.md](docs/art-spec.md), **phong cách A "Bóng đêm tối giản"**. Trong lúc chờ, mình làm hình placeholder.                              |
| 21/11 | Nhóm **8–10 người**. Cả 2 chế độ đều vừa (Cổ điển: 1–2 Sói; Một Đêm: tối đa 10 người). Preset mặc định thiết kế cho 8, 9 và 10 người.                                                       |
| 21/11 | Ma Sói Cổ điển: **đêm đầu vẫn gọi đủ mọi vai** để không lộ vai (UW-N1-05).                                                                                                                  |
| 21/11 | Song ngữ **Tiếng Việt + English** (i18n ngay từ M1). Giọng dẫn dùng TTS **"Linh"** (tiếng Việt, có sẵn trên macOS) qua Web Speech API. Bản tiếng Anh dùng giọng tiếng Anh có sẵn của macOS. |

---

## 1. Mục tiêu

Một web app (ưu tiên điện thoại) để nhóm bạn chơi **Ma Sói** khi đi chơi hoặc cắm trại mà không cần bộ bài:

- Một người tạo phòng, những người khác quét QR hoặc nhập mã 4 ký tự để vào. **Không cần tài khoản.**
- Mỗi người xem vai của mình **bí mật** trên điện thoại.
- App **thay quản trò (moderator)**: MacBook đọc lời dẫn, tự gọi các vai thức dậy ban đêm, tự tính kết quả. Nhờ vậy ai cũng được chơi.
- Mọi người **ngồi cùng nhau ngoài đời** và nói chuyện trực tiếp. App chỉ làm "bộ bài + quản trò".

**Ngoài phạm vi:** chơi từ xa với người lạ, tài khoản, xếp hạng, voice chat.

---

## 2. Luật chơi và nguồn

### 2.1 Vì sao chọn Ultimate Werewolf

Trên Walmart và Target, dòng Ma Sói được bán rộng rãi nhất là của **Bezier Games** (tác giả Ted Alspach):

- **One Night Ultimate Werewolf**: có ở [Target](https://www.target.com/p/one-night-ultimate-werewolf-game/-/A-39602108) và [Walmart](https://www.walmart.com/ip/One-Night-Ultimate-Werewolf/40947318). 3–10 người, mỗi ván khoảng 10 phút.
- **Ultimate Werewolf (Revised Edition)**: có ở [Walmart](https://www.walmart.com/ip/Ultimate-Werewolf-Revised-Edition/40631997). Đây là bản Ma Sói "nhiều đêm" kinh điển, có quản trò.

Vì vậy app có **2 chế độ**, mỗi chế độ bám theo một bộ luật:

| Chế độ             | Luật gốc                      | Khi nào chơi                                                   |
| ------------------ | ----------------------------- | -------------------------------------------------------------- |
| **Ma Sói Cổ điển** | _Ultimate Werewolf_           | Ván dài 20–45 phút, 6–16 người, có người bị loại               |
| **Ma Sói Một Đêm** | _One Night Ultimate Werewolf_ | Ván nhanh khoảng 10 phút, 3–10 người, không ai phải ngồi ngoài |

### 2.2 Trích dẫn

| #    | Nguồn                                                                                                                                                      | Ghi chú                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [S1] | _Ultimate Werewolf: Ultimate Edition_ rulebook, bản chép lại tại [rulespal.com](https://www.rulespal.com/ultimate-werewolf-ultimate-edition/rulebook)      | Nguồn chi tiết nhất mình đọc được. ⚠️ Đây là bản chép của bên thứ ba, và **là edition cũ hơn** bản Revised đang bán. |
| [S2] | [BoardGameGeek: Ultimate Werewolf (2014)](https://boardgamegeek.com/boardgame/152241/ultimate-werewolf)                                                    | Bezier có đăng PDF luật bản 2014 ở mục Files (cần đăng nhập BGG để tải).                                             |
| [S3] | [Wikipedia: Ultimate Werewolf](https://en.wikipedia.org/wiki/Ultimate_Werewolf)                                                                            | Lịch sử, các edition, khác biệt giữa Ultimate Werewolf và One Night                                                  |
| [S4] | Rulebook _One Night Ultimate Werewolf_ (Bezier Games), đi kèm hộp bài                                                                                      | 🔍 Cần bản PDF chính thức để đối chiếu                                                                               |
| [S5] | [Wikipedia: Mafia (party game)](<https://en.wikipedia.org/wiki/Mafia_(party_game)>), [Andrew Plotkin: Werewolf](https://www.eblong.com/zarf/werewolf.html) | Nguồn gốc trò chơi (Davidoff 1986, Plotkin 1997)                                                                     |
| [S6] | [U.S. Copyright Office, FL-108: Games](https://www.copyright.gov/fls/fl108.pdf)                                                                            | Luật chơi không được bảo hộ bản quyền; văn bản và hình ảnh thì có                                                    |

> ⚠️ **Việc cần làm trước M2:** Lấy **PDF luật chính thức bản Revised** (từ BGG [S2] hoặc trang Bezier) để đối chiếu từng dòng trong mục 7. Các dòng có 🔍 hiện dựa trên [S1] (edition cũ) hoặc trên hiểu biết chung.

### 2.3 Bản quyền

- **Được dùng:** cơ chế và luật chơi [S6].
- **Không dùng:** văn bản rulebook, hình minh hoạ, tên thương mại.
- Vì vậy app sẽ **tự viết lại lời luật bằng tiếng Việt**, **dùng hình của chính nhóm**, dùng tên vai phổ thông (Sói, Tiên tri, Bảo vệ…), và **không** dùng "Ultimate Werewolf" làm tên sản phẩm. Trong tài liệu chỉ ghi các bộ bài đó làm nguồn tham khảo.

### 2.4 Goose Goose Duck

Không làm bản sao (vì đó là game thương mại, và lối chơi dựa trên bản đồ và voice từ xa). Có thể cân nhắc một chế độ **nguyên bản** "kẻ phản bội làm nhiệm vụ ngoài đời" ở khu cắm trại, ở giai đoạn rất sau. ❓

---

## 3. Âm thanh: không có voice chat, có giọng quản trò

- Mọi người nói chuyện trực tiếp. **Không làm voice chat.**
- **MacBook** mở "màn hình quản trò" (trình duyệt, toàn màn hình) và phát lời dẫn:
  - Ghi âm sẵn file tiếng Việt: chất lượng tốt nhất. **Đề xuất.** ❓ Bạn có muốn tự thu không?
  - Phương án dự phòng: Web Speech API. Trên macOS có sẵn giọng tiếng Việt "Linh".
- Điện thoại cá nhân **im lặng** ban đêm để không lộ vai.

---

## 4. Hạ tầng

- **Cloudflare** (Workers + Durable Objects) là phương án chính, vì khu cắm trại có wifi.
- MacBook chỉ cần mở trình duyệt, không phải chạy server.
- Dự phòng (ưu tiên thấp): MacBook chạy server Bun bằng một lệnh, mọi người vào qua wifi LAN. Dùng chung engine.
- Không làm WebRTC P2P.

---

## 5. Tech stack

Chi tiết ở [architecture_guidelines.md](architecture_guidelines.md). Tóm tắt:

| Tầng     | Lựa chọn                                                                               |
| -------- | -------------------------------------------------------------------------------------- |
| Ngôn ngữ | TypeScript strict, dùng chung client/server                                            |
| Frontend | Svelte 5 + Vite, PWA, Tailwind v4                                                      |
| Realtime | Cloudflare Workers + Durable Objects (mỗi phòng một DO), WebSocket Hibernation, Alarms |
| Validate | Valibot                                                                                |
| Test     | Vitest + Playwright                                                                    |
| Monorepo | pnpm workspaces                                                                        |
| Dự phòng | Bun server (LAN), AWS Lightsail                                                        |

```text
boardwfriends/
├── apps/
│   ├── web/            # Svelte PWA: màn hình người chơi + màn hình quản trò (MacBook)
│   ├── worker/         # Cloudflare Worker + Durable Object "Room"
│   └── lan-server/     # Bun server offline (để sau)
├── packages/
│   ├── engine/         # Logic game thuần TS
│   ├── protocol/       # Message types + schema
│   └── content/        # Text, lời dẫn, audio, hình thẻ bài
└── docs/
    ├── rules/          # Luật từng chế độ, trích nguồn từng điều
    └── art-spec.md     # Yêu cầu hình ảnh
```

---

## 6. Thiết kế kỹ thuật chính

### 6.1 Engine

- Dạng **reducer thuần**: `apply(state, action, ctx) -> { state, events }`. RNG có seed, nên test được 100% và replay được.
- **Mỗi vai là một module** (`team`, `nightOrder`, `canAct`, `resolve`, `onDeath`, `winCondition`).
- **Projection** `viewFor(state, playerId)`: client chỉ nhận đúng phần mình được biết.
- **Variant flags** cho những chỗ các edition khác nhau (xem mục 7).

### 6.2 Kết nối trên điện thoại

- Khoá màn hình làm rớt kết nối, nên app **tự vào lại đúng ghế** bằng `playerToken` lưu trong `localStorage`.
- Dùng Screen Wake Lock để giữ màn hình sáng.
- Mỗi phase có timeout phía server.
- Nếu máy host rớt, có cơ chế chuyển quyền host.

### 6.3 Chống lộ thông tin khi ngồi chung

- **Ban đêm ai cũng phải bấm điện thoại**, kể cả Dân làng (thao tác giả), để không đoán được vai qua việc ai đang cầm máy.
- Mỗi bước đêm có **thời lượng cố định**, dù đã bấm xong sớm.
- Thẻ vai kiểu **"giữ để xem"**. Giao diện tối.

> Luật gốc yêu cầu mọi người nhắm mắt và chỉ tay [S1]. App thay việc chỉ tay bằng bấm trên điện thoại. Mọi người vẫn có thể nhắm mắt hoặc úp mặt cho đúng không khí, nhưng app không bắt buộc.

### 6.4 UX

- Dark mode, nút to, dùng một tay, vào phòng bằng QR.
- Màn hình quản trò trên MacBook (16:9) hiển thị phase, đồng hồ, người chết, kết quả vote, có hình nền ngày/đêm.
- Có chế độ **"quản trò người thật"**: app chỉ chia bài và hiện kịch bản gọi vai cho người dẫn.

---

## 7. Luật chi tiết

### 7.1 Ma Sói Cổ điển: ✅ đã đối chiếu với tài liệu chính thức Bezier 2021

Chi tiết đầy đủ, có mã luật và số trang: **[docs/rules/classic.md](docs/rules/classic.md)**.

Những điểm **thay đổi so với bản nháp v0.2** sau khi đọc tài liệu chính thức:

- **Phù thuỷ:** chỉ được dùng **1 lần trong cả ván**: hoặc cứu, hoặc giết. Không phải 2 bình thuốc riêng.
- **Sói thắng khi số Sói ≥ số người phe Làng.** Đây là luật chuẩn, không phải tuỳ chọn.
- **Bảo vệ:** không được tự bảo vệ mình.
- **Sói:** quá 30 giây không thống nhất thì đêm đó không giết ai. Sói được phép chọn giết một Sói khác.
- **Thợ săn:** nếu chết ban đêm thì sáng hôm sau mới bắn.
- **Ngày:** gợi ý giới hạn 5 phút (không phải 10). Ngay ngày đầu đã có thể vote loại người.
- **Thợ thuộc da (Tanner):** điểm là −2 (bản cũ ghi +1).
- **Vai giai đoạn 2** đổi theo đúng bộ bài 2021: Sói con, Phù thuỷ tà, Thợ thuộc da, Thằng ngốc, Thầy phép, Kẻ mất ngủ, Hội kín, Chupacabra.

### 7.2 Ma Sói Một Đêm: ⚠️ đã đối chiếu một phần

Chi tiết ở **[docs/rules/one-night.md](docs/rules/one-night.md)**.

- ✅ Vai, thứ tự gọi đêm, điều kiện thắng: đã có nguồn chính thức (rulebook ONUW 2015 và thẻ tra cứu điều kiện thắng của Bezier).
- ❗ **Phần thảo luận và vote** (nhiều phiếu nhất thì chết, hoà thì tất cả chết, không ai quá 1 phiếu thì không ai chết) **chưa có nguồn**. Cần file _Getting Started Guide_ của ONUW.

---

## 8. Hình ảnh thẻ bài

Spec đầy đủ ở [docs/art-spec.md](docs/art-spec.md): kích thước, định dạng, vùng an toàn, danh sách hình cần vẽ, 3 phong cách gợi ý kèm prompt mẫu.

---

## 9. Lộ trình (milestones)

| #                        | Mục tiêu                                                                                                                                                                                                                                                                | Kết quả dùng được                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **M0** ✅ (21/11)        | Monorepo, một DO room, WebSocket, join bằng QR, reconnect. Đã chạy trên Chrome giả lập điện thoại; **còn thiếu: test trên iPhone/Android thật**                                                                                                                         | Chứng minh kiến trúc chạy được   |
| **M1** ✅ (21/11)        | **"Bộ bài số"**: chủ phòng chọn bộ vai (13 vai bộ 2021, preset, tổng điểm cân bằng), chia bài bí mật, "giữ để xem", màn hình quản trò người thật (bàn chơi + kịch bản đêm đầu / các đêm sau / ban ngày). Hình placeholder (emoji). Còn thiếu: test trên điện thoại thật | ✅ **Chơi được khi đi cắm trại** |
| **M2** ✅ (21/11)        | App tự dẫn Ma Sói Cổ điển: đêm (mọi vai bộ 2021), ngày (đề cử, ủng hộ, bào chữa, bỏ phiếu), Thợ săn, điều kiện thắng, tạm dừng. Màn hình dẫn truyện MacBook (`/r/MÃ/tv`) đọc bằng giọng Linh. Quyết định app: `docs/rules/classic.md` §9b                               | Chơi không cần người dẫn         |
| **M3** ✅ (21/11)        | Ma Sói Một Đêm: 11 vai bộ gốc (trừ Kẻ sao chép), tráo bài, bỏ phiếu cùng lúc, kết quả theo lá cuối                                                                                                                                                                      | Ván nhanh                        |
| **M4** ✅ (21/11)        | Tự nhận hình thẻ bài trong `apps/web/src/assets/art/`, xếp chỗ ngồi, thống kê cuối ván, PWA (cài lên màn hình chính). **Còn chờ: hình thật của bạn**                                                                                                                    |                                  |
| **M5** ✅ (21/11)        | Server offline trên MacBook (`pnpm lan`), Node + `ws` (Bun chưa cài trên máy), lưu phòng ra đĩa, dùng chung RoomCore với Cloudflare                                                                                                                                     | Chơi không cần Internet          |
| **Giọng nói** ✅ (21/11) | MacBook nghe lệnh giọng nói (thử nghiệm): đề cử, ủng hộ, bỏ phiếu, tạm dừng, tiếp tục, kết thúc ngày, đọc lại                                                                                                                                                           |                                  |
| M6 (?)                   | Chế độ nguyên bản "kẻ phản bội ngoài đời"                                                                                                                                                                                                                               | ❓                               |

---

## 10. Câu hỏi mở ❓

1. ~~Internet ở chỗ cắm trại~~ ✅ Có wifi; MacBook làm máy quản trò.
2. ~~Bộ luật chuẩn~~ ✅ Ultimate Werewolf + One Night. Bạn có tải được PDF luật bản Revised từ BGG không (cần tài khoản BGG)? Nếu không, mình sẽ tiếp tục theo [S1] và đánh dấu rõ những chỗ chưa xác minh.
3. ~~Quản trò~~ ✅ Có cả hai (chốt 21/11). Ma Sói Cổ điển: chủ phòng chọn "App tự dẫn" hoặc "Quản trò người thật" trong phần cài đặt phòng. Ma Sói Một Đêm: chỉ có app tự dẫn.
4. ~~Số người~~ ✅ 8–10 người.
5. ~~Ngôn ngữ~~ ✅ Tiếng Việt + English.
6. ~~Frontend~~ ✅ Svelte 5.
7. ~~Bỏ Rails~~ ✅ Đã chốt.
8. **Chế độ "kẻ phản bội ngoài đời" (M6):** có hứng thú không?
9. ~~Giọng dẫn~~ ✅ TTS "Linh".
10. ~~Phong cách hình~~ ✅ Phong cách A.
