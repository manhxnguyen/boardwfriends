# boardwfriends

**[Tiếng Việt](#tiếng-việt)** · **[English](#english)**

Chơi thử / Play now: **<https://boardwfriends.bwf-web.workers.dev>**

Ý tưởng, định hướng sản phẩm và quyết định: Manh Nguyen. Lập trình với sự hỗ trợ của Claude.
Idea, product direction and decisions: Manh Nguyen. Implementation assisted by Claude.

---

## Tiếng Việt

Web app chơi **Ma Sói** trực tiếp cùng bạn bè: mỗi người dùng điện thoại của mình, còn một laptop,
PC có loa hoặc TV Android làm **người dẫn truyện** (đọc lời dẫn, hiện đồng hồ và mã QR). Giao diện
mặc định tiếng Việt, đổi được sang tiếng Anh.

### Chế độ chơi

| Chế độ                                                        | Số người | Ai dẫn truyện                                                                    |
| ------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| **Ma Sói cổ điển** (luật Ultimate Werewolf, 13 vai)           | 3–20     | App (màn hình dẫn truyện) **hoặc** một người dẫn (app chia bài và hiện kịch bản) |
| **Ma Sói một đêm** (luật One Night Ultimate Werewolf, 11 vai) | 3–10     | App                                                                              |

Luật kèm trích dẫn và các điểm app tự quyết định: [docs/rules](docs/rules).

### Cần chuẩn bị

- Mỗi người một điện thoại, chung một mạng wifi (hoặc cùng có internet).
- Một **màn hình dẫn truyện**: laptop, PC hoặc TV Android **có loa** (loa sẵn hay loa ngoài đều
  được), đặt ở chỗ cả nhóm cùng thấy và nghe rõ.

### Cách chơi (có internet)

Không cần cài gì, chỉ cần mở trang web.

1. Trên màn hình dẫn truyện, mở **<https://boardwfriends.bwf-web.workers.dev>**, kéo xuống cuối trang
   chủ và bấm **“Tạo phòng trên màn hình này”**. Màn hình hiện mã QR lớn và mã phòng.
2. Mọi người quét mã QR bằng điện thoại. Người vào đầu tiên là **chủ phòng**, chọn bộ bài và bắt đầu.
3. Bấm **“🔊 Bật âm thanh”** trên màn hình dẫn truyện (trình duyệt chỉ cho phát tiếng sau một cú bấm).

Nếu phòng đã được tạo trên điện thoại, màn hình dẫn truyện vào bằng **“Màn hình dẫn truyện” → nhập
mã phòng → Mở**, hoặc mở link dẫn truyện hiện trong phòng.

### Chơi không cần internet (máy chủ trong mạng nhà)

Một máy Mac (hoặc PC) chạy máy chủ; điện thoại chỉ cần chung wifi với máy đó.

```sh
pnpm install      # lần đầu
pnpm lan          # build rồi chạy máy chủ ở cổng 8080
```

- Điện thoại mở địa chỉ in ở dòng “Phones (same wifi)” (mã QR trên màn hình cũng trỏ tới đó).
- Màn hình dẫn truyện trên chính máy đó mở <http://localhost:8080>.
- Thêm `--data ./rooms` (ví dụ `pnpm lan:start -- --data ./rooms`) để giữ phòng khi khởi động lại.
- macOS có thể hỏi cho phép `node` nhận kết nối: chọn cho phép.

### Giọng đọc

Màn hình dẫn truyện có ô chọn **“Giọng đọc”**. Mặc định app chọn theo thứ tự:

1. **[VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS)** (nếu có): giọng Việt tự cài trên Mac
   hoặc PC của bạn. Có 25 giọng, mặc định “Ngọc Linh”. Người dẫn có cảm xúc: hắng giọng khi bắt đầu
   và khi bỏ phiếu, thở dài khi có người chết, cười khi một phe thắng (tính năng thử nghiệm của
   VieNeu). Mỗi câu mất khoảng 0,5 giây trên Mac M-series, câu sau được tạo sẵn trong lúc đọc câu
   trước. VieNeu chỉ đọc tiếng Việt; câu tiếng Anh dùng giọng khác. Có 3 cách dùng, xem bên dưới.
2. **Giọng Google** (`vi-VN-Neural2-A`): có sẵn trên bản Cloudflare. Với máy chủ trong mạng nhà, cần
   internet và chạy `GOOGLE_TTS_API_KEY=… pnpm lan`.
3. **Giọng có sẵn trên máy** đúng ngôn ngữ (giọng “Natural” của Edge, giọng “Nâng cao” của macOS).
4. App không bao giờ đọc tiếng Việt bằng giọng nước ngoài: nếu máy không có giọng phù hợp, màn hình
   chỉ cách cài thêm.

Khi một giọng gặp lỗi (VieNeu tắt, mất mạng), app tự chuyển sang giọng kế tiếp và hiện cảnh báo;
chọn lại giọng để thử lại. Phụ đề trên điện thoại không bao giờ hiện các thẻ cảm xúc.

### Dùng giọng VieNeu: chọn 1 trong 3 cách

Cài VieNeu-TTS theo hướng dẫn trong repo của VieNeu, rồi chạy máy chủ giọng đọc của nó trong thư
mục VieNeu-TTS:

```sh
uv run python -m apps.openai_speech        # nghe ở http://127.0.0.1:8000
```

| Cách                              | Người chơi vào bằng       | Cần internet | Màn hình là TV | Lệnh          |
| --------------------------------- | ------------------------- | ------------ | -------------- | ------------- |
| **A. Máy chủ trong mạng nhà**     | `http://192.168.x.x:8080` | Không        | ✅             | `pnpm lan`    |
| **B. VieNeu trên máy dẫn truyện** | link Cloudflare           | Có           | ❌             | `pnpm voice`  |
| **C. Cloudflare Tunnel**          | link Cloudflare           | Có           | ✅             | `pnpm tunnel` |

**A. Máy chủ trong mạng nhà** (đi cắm trại, không cần internet). Máy chủ của app gọi thẳng VieNeu:

```sh
VIENEU_URL=http://127.0.0.1:8000 pnpm lan
```

VieNeu chạy trên một PC khác trong mạng: chạy nó với `HOST=0.0.0.0 VIENEU_API_KEY=<khoá>`, rồi
`VIENEU_URL=http://<IP của PC>:8000 VIENEU_API_KEY=<khoá> pnpm lan`.

**B. VieNeu trên chính máy dẫn truyện** (chơi trên Cloudflare, màn hình là laptop hoặc PC đang chạy
VieNeu). Một cầu nối nhỏ cho phép trang Cloudflare gọi VieNeu trên máy này:

```sh
pnpm voice                                 # http://localhost:8090, chỉ máy này dùng được
```

Trên màn hình dẫn truyện, bấm **“🖥️ VieNeu trên máy này”**. Chrome hoặc Edge sẽ hỏi quyền truy cập
mạng nội bộ một lần: chọn **Cho phép**. Các giọng VieNeu hiện trong ô “Giọng đọc”. Cách này không
dùng được khi màn hình là TV, vì trình duyệt chặn trang https gọi tới một máy khác trong mạng nhà.

**C. Cloudflare Tunnel** (chơi trên Cloudflare, màn hình là bất kỳ thiết bị nào, kể cả TV). Tunnel
đưa VieNeu ra internet qua https để máy chủ Cloudflare gọi được. Miễn phí. Cần `cloudflared`
(`brew install cloudflared`) và `wrangler login`.

```sh
# Tạo một khoá dài, ngẫu nhiên, và giữ kín: tunnel là công khai, khoá bảo vệ VieNeu của bạn.
export VIENEU_API_KEY=$(openssl rand -hex 24)
# Cửa sổ 1, trong thư mục VieNeu-TTS (cùng biến VIENEU_API_KEY):
uv run python -m apps.openai_speech
# Cửa sổ 2, trong thư mục boardwfriends:
pnpm tunnel
```

`pnpm tunnel` kiểm tra VieNeu đã có khoá, mở một tunnel nhanh (`*.trycloudflare.com`), rồi lưu địa
chỉ và khoá vào Worker (secret `VIENEU_URL`, `VIENEU_API_KEY`). Tải lại màn hình dẫn truyện là thấy
các giọng VieNeu. Giữ hai cửa sổ chạy trong lúc chơi; Ctrl+C để đóng tunnel, khi đó app quay về giọng
Google. Địa chỉ tunnel nhanh đổi mỗi lần chạy, nên mỗi lần chơi chạy lại `pnpm tunnel`.

Muốn địa chỉ cố định (cần một tên miền trên Cloudflare, khoảng 10 USD/năm):

```sh
cloudflared tunnel login
cloudflared tunnel create vieneu
cloudflared tunnel route dns vieneu tts.<tên-miền-của-bạn>
cloudflared tunnel run --url http://127.0.0.1:8000 vieneu     # mỗi lần chơi
# Một lần duy nhất (nhập giá trị khi được hỏi):
pnpm --filter @bwf/worker exec wrangler secret put VIENEU_URL       # https://tts.<tên-miền>
pnpm --filter @bwf/worker exec wrangler secret put VIENEU_API_KEY   # khoá của VieNeu
```

Âm thanh VieNeu khoảng 50 KB mỗi giây đọc (24 kHz); một ván dùng khoảng 20–30 MB qua tunnel. Câu đã
đọc được Cloudflare lưu lại, đọc lại không tốn thêm.

### Lệnh giọng nói (đang tạm tắt)

Tính năng màn hình dẫn truyện nghe người chơi nói (“tôi đề cử Bình”, “bỏ phiếu”…) đang tắt
(`VOICE_COMMANDS` trong `apps/web/src/lib/features.ts`). Phần đọc lời dẫn không bị ảnh hưởng.

### Dành cho lập trình viên

Yêu cầu: Node.js ≥ 22, pnpm ≥ 10 (`corepack enable` hoặc `npm i -g pnpm`).

```sh
pnpm install
pnpm dev          # web + Cloudflare Worker + Durable Objects chạy local, cổng 5173
```

`pnpm dev` cũng mở cho mạng nhà: điện thoại chung wifi quét mã QR là vào được (mã QR trỏ tới địa
chỉ mạng của máy đang chạy). Danh sách lệnh, cấu trúc thư mục và tài liệu: xem
[phần tiếng Anh bên dưới](#for-developers).

---

## English

A web app for playing **Werewolf** in person with friends: everyone uses their own phone, and a
laptop, PC with speakers or Android TV is the **narrator screen** (reads the narration, shows the
clock and the QR code). The interface is Vietnamese by default and can be switched to English.

### Game modes

| Mode                                                                 | Players | Who moderates                                                                  |
| -------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| **Classic Werewolf** (Ultimate Werewolf rules, 13 roles)             | 3–20    | The app (narrator screen) **or** a person (the app deals and shows the script) |
| **One Night Werewolf** (One Night Ultimate Werewolf rules, 11 roles) | 3–10    | The app                                                                        |

Rules with citations and the app's own decisions: [docs/rules](docs/rules).

### What you need

- One phone per player, all on the same wifi (or all online).
- One **narrator screen**: a laptop, PC or Android TV **with speakers** (built-in or external),
  placed where everyone can see and hear it.

### How to play (online)

Nothing to install: just open the site.

1. On the narrator screen, open **<https://boardwfriends.bwf-web.workers.dev>**, scroll to the bottom of
   the home page and press **“Tạo phòng trên màn hình này”** (Create a room on this screen). It shows
   a big QR code and the room code.
2. Everyone scans the QR code with their phone. The first to join is the **host**, who picks the deck
   and starts.
3. Press **“🔊 Bật âm thanh”** (Enable sound) on the narrator screen; browsers only play sound after a
   click.

If a phone created the room, the narrator screen joins with **“Màn hình dẫn truyện” (Narrator screen)
→ room code → Mở (Open)**, or by opening the narrator link shown in the room.

### Playing without internet (LAN server)

One Mac (or PC) runs the server; phones only need to be on the same wifi.

```sh
pnpm install      # first time
pnpm lan          # builds everything, then serves the app on port 8080
```

- Phones open the address printed as “Phones (same wifi)” (the on-screen QR code points there too).
- The narrator screen on that same machine opens <http://localhost:8080>.
- Add `--data ./rooms` (e.g. `pnpm lan:start -- --data ./rooms`) to keep rooms across restarts.
- macOS may ask to allow incoming connections for `node`: accept.

### Narration voice

The narrator screen has a **“Giọng đọc”** (Voice) dropdown. By default the app picks, in order:

1. **[VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS)** (when available): a Vietnamese voice you
   host on your own Mac or PC. 25 voices, default “Ngọc Linh”. The narrator shows feelings: it
   clears its throat at the start and before votes, sighs at deaths and laughs when a side wins (an
   experimental VieNeu feature). About 0.5 s per sentence on an M-series Mac, and the next sentence
   is generated while the current one plays. VieNeu reads Vietnamese only; English lines use another
   voice. Three ways to use it, see below.
2. **Google voice** (`vi-VN-Neural2-A`): available on the Cloudflare deployment. On the LAN server it
   needs internet and `GOOGLE_TTS_API_KEY=… pnpm lan`. Optional `GOOGLE_TTS_VOICE_VI` /
   `GOOGLE_TTS_VOICE_EN` pick other voices.
3. **A voice installed on the device** for the right language (Edge “Natural”, macOS “Enhanced”).
4. Never a voice of another language: if none fits, the screen explains how to install one.

When a voice fails (VieNeu stopped, no internet), the app moves to the next one and shows a warning;
pick the voice again to retry. Phone captions never show the emotion tags.

### Using the VieNeu voice: pick one of three ways

Install VieNeu-TTS following the guide in its repo, then run its speech server in the VieNeu-TTS
folder:

```sh
uv run python -m apps.openai_speech        # listens on http://127.0.0.1:8000
```

| Way                                    | Players open              | Internet | TV as narrator | Command       |
| -------------------------------------- | ------------------------- | -------- | -------------- | ------------- |
| **A. LAN server**                      | `http://192.168.x.x:8080` | No       | ✅             | `pnpm lan`    |
| **B. VieNeu on the narrator computer** | the Cloudflare link       | Yes      | ❌             | `pnpm voice`  |
| **C. Cloudflare Tunnel**               | the Cloudflare link       | Yes      | ✅             | `pnpm tunnel` |

**A. LAN server** (camping, no internet). The app's own server calls VieNeu:

```sh
VIENEU_URL=http://127.0.0.1:8000 pnpm lan
```

VieNeu on another PC of the network: run it with `HOST=0.0.0.0 VIENEU_API_KEY=<key>`, then
`VIENEU_URL=http://<PC address>:8000 VIENEU_API_KEY=<key> pnpm lan`.

**B. VieNeu on the narrator computer itself** (playing on Cloudflare, with the narrator screen on
the laptop or PC that runs VieNeu). A small bridge lets the Cloudflare page call VieNeu on this
computer:

```sh
pnpm voice                                 # http://localhost:8090, this computer only
```

On the narrator screen press **“🖥️ VieNeu trên máy này”** (VieNeu on this computer). Chrome or Edge
asks once for local network access: choose **Allow**. The VieNeu voices then appear in the dropdown.
This does not work with a TV as the narrator screen: browsers block an https page from calling
another machine on the home network.

**C. Cloudflare Tunnel** (playing on Cloudflare, any narrator device including a TV). The tunnel puts
VieNeu on the internet over https so the Cloudflare server can reach it. Free. Needs `cloudflared`
(`brew install cloudflared`) and `wrangler login`.

```sh
# Make a long random key and keep it secret: the tunnel is public, the key protects your VieNeu.
export VIENEU_API_KEY=$(openssl rand -hex 24)
# Terminal 1, in the VieNeu-TTS folder (same VIENEU_API_KEY):
uv run python -m apps.openai_speech
# Terminal 2, in the boardwfriends folder:
pnpm tunnel
```

`pnpm tunnel` checks that VieNeu has a key, opens a quick tunnel (`*.trycloudflare.com`) and stores
its address and the key in the Worker (secrets `VIENEU_URL`, `VIENEU_API_KEY`). Reload the narrator
screen to see the VieNeu voices. Keep both terminals running while you play; Ctrl+C closes the
tunnel and the app falls back to the Google voice. The quick tunnel address changes on every run, so
run `pnpm tunnel` again each time you play.

For a fixed address (needs a domain on Cloudflare, about 10 USD/year):

```sh
cloudflared tunnel login
cloudflared tunnel create vieneu
cloudflared tunnel route dns vieneu tts.<your-domain>
cloudflared tunnel run --url http://127.0.0.1:8000 vieneu     # each time you play
# Once (type the value when asked):
pnpm --filter @bwf/worker exec wrangler secret put VIENEU_URL       # https://tts.<your-domain>
pnpm --filter @bwf/worker exec wrangler secret put VIENEU_API_KEY   # VieNeu's key
```

VieNeu audio is about 50 KB per second of speech (24 kHz); a game uses about 20–30 MB through the
tunnel. Cloudflare caches spoken sentences, so repeats cost nothing.

### Voice commands (paused)

Listening to players (“I nominate Binh”, “vote”…) is switched off for now (`VOICE_COMMANDS` in
`apps/web/src/lib/features.ts`). Narration is unaffected. When on, Chrome sends the audio to Google
and Safari to Apple for recognition; this app records nothing.

### For developers

Requirements: Node.js ≥ 22 (developed on 26), pnpm ≥ 10 (`corepack enable` or `npm i -g pnpm`).

```sh
pnpm install
pnpm dev          # web app + Cloudflare Worker + Durable Objects locally on port 5173
```

`pnpm dev` is reachable from the local network: phones on the same wifi can scan the QR code (it
points at the machine's network address).

| Command            | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `pnpm dev`         | Local dev server (web + Worker + Durable Objects)             |
| `pnpm test`        | Unit tests (engine, protocol, server core, narration, voices) |
| `pnpm typecheck`   | TypeScript + Svelte checks for every package                  |
| `pnpm smoke [url]` | Multi-client WebSocket smoke test against a running server    |
| `pnpm lan`         | Build and run the offline LAN server                          |
| `pnpm voice`       | VieNeu bridge for the narrator screen on the Cloudflare site  |
| `pnpm tunnel`      | Cloudflare quick tunnel to VieNeu + Worker secrets            |
| `pnpm format`      | Prettier                                                      |
| `pnpm build`       | Production build                                              |
| `pnpm cf:deploy`   | Build and deploy to Cloudflare (needs `wrangler login`)       |

Google voice on Cloudflare: `pnpm --filter @bwf/worker exec wrangler secret put GOOGLE_TTS_API_KEY`.

```text
apps/web            Svelte 5 PWA: player screens + narrator screen
apps/worker         Cloudflare Worker + Room Durable Object (adapter)
apps/lan-server     Node offline server (adapter), VieNeu / Google voice proxy, voice bridge
scripts/tunnel.mjs  Quick tunnel to VieNeu for the Cloudflare Worker
packages/server     RoomCore: transport-agnostic room server, narration voices
packages/engine     Pure game logic (no I/O), fully unit tested
packages/protocol   Client ↔ server message types and validation
docs/rules          Game rules with citations and app decisions
```

- Card art: images named `role-<id>.png` in `apps/web/src/assets/art/` replace the emoji
  placeholders (see [docs/art-spec.md](docs/art-spec.md)).
- Roadmap: [plan.md](plan.md). Architecture and coding rules:
  [architecture_guidelines.md](architecture_guidelines.md), [instructions.md](instructions.md).
