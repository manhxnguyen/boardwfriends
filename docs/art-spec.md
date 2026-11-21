# Yêu cầu hình ảnh (Art Spec)

> Dành cho người tạo hình (vẽ tay hoặc AI). Mình (Claude) sẽ lo phần code: khung thẻ, tên vai, điểm, màu phe, nén ảnh. Trong lúc chờ hình thật, app dùng hình placeholder SVG đơn giản do mình tạo.

## 1. Nguyên tắc chung

1. **Không có chữ trong hình.** Tên vai, điểm và biểu tượng phe do code vẽ đè lên. Nhờ vậy có thể đổi ngôn ngữ (Việt/Anh) và chỉnh luật mà không phải vẽ lại.
2. **Không có viền, không bo góc.** Hình tràn kín (full bleed); code sẽ tự bo góc và vẽ khung.
3. **Nhất quán cả bộ:** cùng phong cách, cùng hướng ánh sáng (ví dụ ánh trăng từ trên bên trái), cùng khung hình (nhân vật từ thắt lưng trở lên, góc 3/4), cùng bảng màu.
4. **Đọc được khi nhỏ:** hình sẽ hiển thị cả to (thẻ vai toàn màn hình) lẫn rất nhỏ (khoảng 64px trong danh sách chọn vai). Cần hình khối rõ, tương phản cao, ít chi tiết vụn.
5. **Nền tối:** app chạy dark mode và chơi vào ban đêm, nên tông chủ đạo là tối.
6. **Bản quyền:** hình phải do nhóm tự tạo. Không lấy hay chỉnh sửa từ hình của các bộ bài thương mại.

## 2. Thông số kỹ thuật

### 2.1 Hình vai (role card art)

| Thuộc tính     | Yêu cầu                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tỉ lệ          | **5:7** (dọc), giống lá bài poker 63×88 mm                                                                                                                                         |
| Kích thước gốc | **1500 × 2100 px** (tối thiểu 1000 × 1400 px)                                                                                                                                      |
| Định dạng gửi  | **PNG** (sRGB, 8-bit, không cần nền trong suốt). Nếu vẽ vector thì gửi **SVG**.                                                                                                    |
| Vùng an toàn   | Chủ thể chính (mặt, tay, đạo cụ) nằm trong **vùng giữa**: cách mép trái/phải 8%, cách mép trên 15%, cách mép dưới 25%. Phía trên sẽ có tên vai đè lên, phía dưới có mô tả và điểm. |
| Nền            | Phủ kín hình, tối dần về phía mép dưới để chữ trắng đọc rõ                                                                                                                         |

Code sẽ tự xuất ra các kích thước dùng trong app: WebP 750×1050 (màn hình lớn), 375×525 và 128×180 (thumbnail). Mỗi file khoảng 150 KB trở xuống.

```text
┌──────────────────┐  ← 0%
│   [TÊN VAI]      │     vùng chữ đè (15%)
│ ┌──────────────┐ │
│ │              │ │
│ │   CHỦ THỂ    │ │     vùng an toàn
│ │   CHÍNH      │ │
│ │              │ │
│ └──────────────┘ │
│  mô tả · điểm    │     vùng chữ đè (25%)
└──────────────────┘  ← 100%
 8%              8%
```

### 2.2 Mặt sau thẻ (card back)

- 1500 × 2100 px, PNG.
- **Đối xứng khi xoay 180°**, không có chi tiết gợi ý vai.
- Có thể có logo hoặc hoa văn của nhóm.

### 2.3 Màn hình quản trò (MacBook)

| Hình          | Kích thước                                         | Ghi chú                                                                |
| ------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| `bg-night`    | **2560 × 1600 px** (16:10, đúng tỉ lệ màn MacBook) | Làng ban đêm. **Khoảng giữa tối và trống** để hiển thị chữ và đồng hồ. |
| `bg-day`      | 2560 × 1600 px                                     | Làng ban ngày hoặc buổi sáng                                           |
| `win-village` | 2560 × 1600 px                                     | Dân làng chiến thắng                                                   |
| `win-wolves`  | 2560 × 1600 px                                     | Sói chiến thắng                                                        |

Định dạng: PNG hoặc JPG chất lượng cao.

### 2.4 Icon app (PWA)

- **1024 × 1024 px**, PNG, nền đặc (không trong suốt).
- Chủ thể nằm trong **vòng tròn ở giữa, chiếm 80%** (để Android cắt thành hình tròn vẫn không mất chi tiết).
- Code sẽ tự xuất các size 512, 192, 180 (iOS) và favicon.

### 2.5 Biểu tượng phe

Không cần vẽ. Mình dùng bộ icon mã nguồn mở (Lucide/Tabler) và tô màu theo phe:

| Phe                        | Màu gợi ý          |
| -------------------------- | ------------------ |
| Sói                        | Đỏ thẫm `#C0392B`  |
| Dân làng                   | Xanh lam `#2E86C1` |
| Trung lập (Tanner, Cupid…) | Tím `#8E44AD`      |

## 3. Danh sách hình cần làm

Đặt tên file theo ID tiếng Anh, kebab-case, ví dụ `role-werewolf.png`.

**Đợt 1 (MVP, Ma Sói Cổ điển)**: 7 thẻ + nền + icon

| File                                                              | Vai          | Gợi ý nội dung                                          |
| ----------------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `card-back.png`                                                   | Mặt sau      | Mặt trăng, rừng, hoa văn                                |
| `role-villager.png`                                               | Dân làng     | Người dân bình thường, cầm đèn hoặc công cụ, vẻ lo lắng |
| `role-werewolf.png`                                               | Sói          | Sói hình người dưới trăng, mắt phát sáng                |
| `role-seer.png`                                                   | Tiên tri     | Người cầm quả cầu pha lê hoặc con mắt thứ ba phát sáng  |
| `role-bodyguard.png`                                              | Bảo vệ       | Người cầm khiên hoặc giáo, đứng chắn trước cửa nhà      |
| `role-hunter.png`                                                 | Thợ săn      | Người cầm nỏ hoặc cung, ánh mắt sắc                     |
| `role-witch.png`                                                  | Phù thuỷ     | Người cầm 2 lọ thuốc: một xanh (cứu), một tím đen (độc) |
| `bg-night.png`, `bg-day.png`, `win-village.png`, `win-wolves.png` | Màn quản trò | Xem mục 2.3                                             |
| `app-icon.png`                                                    | Icon         | Ví dụ đầu sói và mặt trăng                              |

**Đợt 2 (vai mở rộng, theo bộ bài 2021):** `role-wolf-cub` (Sói con), `role-sorceress` (Phù thuỷ tà), `role-tanner` (Thợ thuộc da), `role-village-idiot` (Thằng ngốc), `role-spellcaster` (Thầy phép), `role-insomniac` (Kẻ mất ngủ), `role-mason` (Hội kín), `role-chupacabra`.

**Đợt 3 (Ma Sói Một Đêm):** `role-robber` (Kẻ trộm), `role-troublemaker` (Kẻ phá rối), `role-drunk` (Bợm rượu), `role-insomniac` (Kẻ mất ngủ). Các vai trùng tên thì dùng lại hình của đợt 1 và 2.

## 4. Gợi ý phong cách (chọn 1)

### A. "Bóng đêm tối giản" (đề xuất cho MVP)

Vector phẳng, 3–4 màu: xanh đêm đậm, vàng trăng, một màu nhấn theo phe. Nhân vật dạng bóng (silhouette) có viền sáng.

- **Ưu:** rất hợp dark mode; đọc rõ ở kích thước nhỏ; dễ giữ nhất quán khi tạo bằng AI; file nhẹ (có thể là SVG).
- **Nhược:** ít chi tiết, ít "cảm xúc".

Prompt mẫu (AI tạo ảnh):

```text
Flat vector illustration, minimalist silhouette style, deep navy night background,
large pale-yellow full moon, limited palette of 4 colors (navy #0F1B2D, moon yellow #F4D35E,
off-white rim light, accent {TEAM_COLOR}), waist-up character in 3/4 view, centered,
strong clear shapes, no text, no border, portrait 5:7.
Subject: {SUBJECT}
```

### B. "Làng quê Việt kiểu tranh dân gian"

Lấy cảm hứng từ tranh khắc gỗ dân gian Việt Nam: nét viền đen, mảng màu phẳng, màu đất và giấy dó. Bối cảnh là một làng Việt có luỹ tre và mái đình. Các vai được "Việt hoá": Tiên tri là thầy bói, Phù thuỷ là bà lang bốc thuốc, Bảo vệ là tuần đinh, Thợ săn mang nỏ, Dân làng đội nón lá.

- **Ưu:** độc đáo, mang chất riêng của nhóm, có câu chuyện.
- **Nhược:** khó giữ nhất quán khi dùng AI; nền sáng (màu giấy) nên cần chỉnh cho hợp dark mode.

Prompt mẫu:

```text
Vietnamese folk woodblock print style, bold black outlines, flat earthy colors
(ochre, deep red, indigo, charcoal) on a dark textured paper background,
Vietnamese village at night with bamboo and a full moon, waist-up character in 3/4 view,
centered, no text, no border, portrait 5:7.
Subject: {SUBJECT}
```

### C. "Sách truyện màu nước"

Màu nước hoặc gouache, ánh đèn lồng ấm trên nền đêm lạnh. Phong cách cổ tích.

- **Ưu:** đẹp và giàu cảm xúc.
- **Nhược:** nhiều chi tiết nên khi thu nhỏ khó đọc; file nặng.

## 5. Cách gửi file

- Bỏ vào thư mục `packages/content/art/source/` (mình sẽ tạo khi bắt đầu M1), hoặc gửi cho mình đường dẫn.
- Gửi trước **1–2 hình mẫu** (ví dụ Sói và Dân làng) để mình ghép thử vào khung thẻ, rồi hãy làm cả bộ.
