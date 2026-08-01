# 法师战争 Step 1 Media 生图阻塞记录

> 状态：`historical-media-route / blocked-invalid-openai-api-key-and-codex-output / superseded-by-open-design-artifact-v6`。本文件只记录 `od media generate` / imagegen 图片模型路线的历史阻塞；它不是当前 Open Design artifact 路线的阻塞。用户已明确“使用 Open Design，不要生图”，当前有效候选为 `mage-wars-step1-runtime-board-v6.html` artifact 与 `step1-runtime-board-opendesign-artifact-v6.png` 渲染审计截图。

## 生成目标

- 对象：Mage Wars / 法师战争两人学徒模式运行时主界面 Step 1 位图设计稿。
- 前置包：`docs/games/mage-wars/design/reference/step1-runtime-board-imagegen-brief.md`。
- Prompt：`docs/games/mage-wars/design/reference/step1-runtime-board-imagegen-prompt.md`。
- 图像输入：Open Design 项目 `mage-wars-ui-design` 下的 `refs/mage-wars-step1/step1-runtime-board-reference-sheet.png`。

## 已执行命令

```powershell
node D:\codex-home\tools\open-design\apps\daemon\bin\od.mjs media generate --project mage-wars-ui-design --surface image --model codex-gpt-image-2 --aspect 16:9 --output step1-runtime-board-v1.png --image refs/mage-wars-step1/step1-runtime-board-reference-sheet.png --prompt-file docs\games\mage-wars\design\reference\step1-runtime-board-imagegen-prompt.md
```

等待命令：

```powershell
node D:\codex-home\tools\open-design\apps\daemon\bin\od.mjs media wait bbf3988c-836c-46f8-a114-12ae6e22633b --since 0
```

## 实际结果

- Open Design daemon 健康：`{"ok":true,"version":"0.16.1"}`。
- 任务已排队并运行：`bbf3988c-836c-46f8-a114-12ae6e22633b`。
- 任务最终失败：Codex imagegen completed，但没有在 `D:\codex-home\generated_images\019fa39b-9475-7b90-a77c-9595169020bb` 写出 `ig_*` 或 `call_*` 图片。
- Open Design 输出建议：使用 API-backed image provider，或使用会写 `generated_images` 输出的 Codex CLI build。
- 追加尝试：改用 API-backed `gpt-image-2` 后，Open Design 任务 `f9174ecd-d17c-4bda-821e-c9521620e7cf` 失败为 `fetch failed`。
- 2026-07-27 继续复测：先启动临时 Open Design daemon `7457` 时代理环境变量未正确注入，该次 `gpt-image-2` 任务 `30bfa10b-1582-4f99-8a4a-a449dddfe1a5` 仍只能作为无效环境复测记录。
- 2026-07-27 有效复测：启动临时 Open Design daemon `7458`，显式设置 `HTTP_PROXY` / `HTTPS_PROXY=http://127.0.0.1:17890`；daemon 健康返回 `{"ok":true,"version":"0.16.1"}`，同一正式输入包和 prompt 执行 `gpt-image-2` 任务 `be202553-a15a-4bb2-adb5-6887fad5b64d`，上游返回 `openai 401 / Incorrect API key`。任务失败后临时 `7457` / `7458` daemon 已停止。
- 2026-07-28 继续复测：Open Design 项目 `mage-wars-ui-design` 下的 `refs/mage-wars-step1/step1-runtime-board-reference-sheet.png` 存在；当前工作树根目录下没有 `refs/mage-wars-step1/`，因此生成命令必须按 Open Design 项目相对路径解析 `--image refs/mage-wars-step1/step1-runtime-board-reference-sheet.png`，不能按工作树相对路径判断输入缺失。
- 2026-07-28 继续复测：同一正式输入包和 prompt 执行 `codex-gpt-image-2` 任务 `6e01967d-845d-409e-b2c1-d3d532b8d5d8`，任务运行后失败为 Codex imagegen completed，但没有在 `D:\codex-home\generated_images\019fa461-7aeb-7c00-8ad1-4017fb9a4ebc` 写出 `ig_*` 或 `call_*` 图片。
- 2026-07-28 继续复测：同一正式输入包和 prompt 改用 API-backed `gpt-image-2` 任务 `7ed488e1-d3df-4610-a5c8-41e37225662e`，上游返回 `openai 401 / Incorrect API key`。本记录不写入也不复述任何 API key 值。
- 2026-07-28 provider 复查：`/api/media/config` 显示只有 OpenAI provider 处于 `configured=true / source=codex-auth`；`codex`、`volcengine`、`nanobanana`、`imagerouter`、`openrouter`、`fal`、`leonardo`、`google`、`aihubmix` 等图像 provider 均为 `configured=false / source=unset`。当前没有另一条已配置的真实出图 provider 可用于同一正式输入包。
- 2026-07-28 本机 OpenAI-compatible 文本 provider 复查：只做 `/models` 能力探测，返回模型列表中没有 `image` / `gpt-image` / `dall-e` / `imagen` / `flux` / `seedream` / `sdxl` / `recraft` / `ideogram` 类图片模型；不能把该文本 provider 作为 Mage Wars 位图设计稿的备用出图链。
- 2026-07-28 继续复测：临时把 Open Design `agentCliEnv.codex.CODEX_BIN` 指向 OpenAI App 自带的 `codex-cli 0.145.0-alpha.27`，使用同一 reference sheet 和 prompt 执行 `codex-gpt-image-2` 任务 `b197ff02-cf00-4c78-83bd-3b184d1cf3be`；任务仍失败为 Codex imagegen completed 但未写出 `ig_*` 或 `call_*` 图片。临时配置已恢复，未永久改动 Open Design app config。
- 2026-07-28 凭据复查：通过已验证可用的本机代理分别检查 `D:\codex-home\auth.json` 与用户目录 Codex auth 中的 OpenAI API key，两处均返回 `401 / Incorrect API key`。本记录不写入也不复述任何密钥值。
- 2026-07-28 本地备用 provider 复查：`ImageRouter`、`OpenRouter`、`Fal`、`Replicate`、`Google / NanoBanana`、`Leonardo`、`AIHubMix`、`ComfyUI` 等相关环境变量均未配置；本机常见绘图端口 `8188`、`7860`、`7861`、`3000`、`5000` 均无可用服务；未发现可接入的本地图像生成进程。当前不能绕过 Open Design 官方 provider 链生成合格位图稿。
- 2026-07-28 Open Design 项目上下文补齐：已把 `step1-runtime-board-imagegen-brief.md`、`step1-runtime-board-imagegen-prompt.md`、`step1-runtime-board-asset-input-manifest.md` 复制到 Open Design 项目 `mage-wars-ui-design/docs/games/mage-wars/design/reference/`，避免 Codex provider 在 OD 项目根目录运行时误判配套 brief 缺失。该动作只补输入上下文，不生成设计稿，也不改变人工验收状态。
- 2026-07-28 恢复脚本补齐：新增 `docs/games/mage-wars/design/generated/run-step1-runtime-board-imagegen.ps1`，用于 provider 可用后按同一 reference sheet / prompt 调用 Open Design、等待任务、把生成文件复制回工作树，并输出 `AI visual audit must PASS before opening for human review`。该脚本不是替代设计稿，也不会放宽人工验收门禁。
- 2026-07-28 当前轮次：用户已明确要求“生成设计稿吧”，已把 `step1-runtime-board-imagegen-prompt.md` 解锁为 `ui-design-approved-by-user / open-design-generation-allowed`。使用同一 reference sheet 和 prompt 执行 `codex-gpt-image-2` 输出 `step1-runtime-board-opendesign-v3.png`，任务 `f4399bef-de5a-4a3e-b47d-49361c534e5b` 运行后失败为 `codex imagegen timed out after 300000ms`；内层 Open Design run `64a41445-d875-4662-a491-2615ee5e820b` 结束但没有生成 artifact，且其 API-backed `gpt-image-2` 子任务返回 `openai 401 / Incorrect API key`。
- 2026-07-28 当前轮次：确认 OD CLI 支持 `OD_CODEX_IMAGEGEN_TIMEOUT_MS`，但同一内层生成链已经暴露 OpenAI 媒体凭据 401，继续延长 Codex-subscription 路线不会绕过无效 provider 凭据问题。
- 2026-07-28 当前轮次：尝试同属 Open Design media 的 `senseaudio-image-2.0-260319` 输出 `step1-runtime-board-opendesign-v3-senseaudio.png`，任务 `84e6e799-3d4c-4517-827a-ab4a56b11ffe` 失败为 `no SenseAudio API key — configure it in Settings or set OD_SENSEAUDIO_API_KEY`。
- 当前未生成 `step1-runtime-board-v1.png`、`step1-runtime-board-opendesign-v3.png`、`step1-runtime-board-opendesign-v3-senseaudio.png` 或其它新候选设计稿。

## Provider 状态

- `D:\codex-home\tools\open-design\.od\media-config.json` 当前为 `{"providers": {}}`。
- Open Design `/api/media/config` 显示 OpenAI provider 已通过本机 Codex auth 识别为 `configured=true`，不是无凭据状态。
- Open Design `/api/media/config` 显示除 OpenAI 外，其它可选 image provider 均未配置；本轮实测 SenseAudio 也缺少 API key，不能改用未配置 provider 生成正式设计稿。
- 本轮仅检查环境变量是否存在，未输出任何密钥值；`OPENAI_API_KEY`、`OD_OPENAI_API_KEY`、`IMAGE_ROUTER_API_KEY`、`OD_IMAGEROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`OD_NANOBANANA_API_KEY`、`LEONARDO_API_KEY`、`OD_LEONARDO_API_KEY` 均未配置。
- Node 直接访问 `https://api.openai.com/v1/models` 失败为 `fetch failed / ConnectTimeoutError`；PowerShell 访问 `https://api.openai.com/v1/models` 和 `https://www.google.com` 也超时，说明当前本机直连外网/API 不可达。
- 注册表中存在历史代理地址 `127.0.0.1:17890`，但系统代理关闭；该端口当前在监听。临时让 Node 通过该代理访问 `https://www.google.com` 返回 `200`，访问 OpenAI API 返回 `401 Unauthorized`，说明代理网络路径可用，但本机缓存 / Codex auth 暴露给 Open Design 的 OpenAI API key 当前无效或不可用于该 API。

## 当前裁定

- 阻塞类型：OpenAI API key 无效；SenseAudio API key 未配置；当前 PATH 上的 Codex CLI 与 OpenAI App 自带新版 Codex CLI 都没有可用的内置图片生成落盘能力；当前没有其它已配置且可证明支持图片生成的 provider；Open Design 项目相对素材输入路径可用，规则 / 素材前置不是当前阻塞点。
- 非阻塞项：规则读取、规则到画面映射、正式素材输入包、prompt 前置和 Open Design 项目内上下文副本已就绪。
- media / imagegen 路线人工验收：仍禁止人工验收；当前 Open Design artifact v6 路线已单独进入 `human-review-allowed / user-approval-pending`。
- 禁止替代：不得用旧 HTML、内部素材拼贴候选、reference sheet、运行页截图或纯 prompt 冒充正式位图设计稿。

## 恢复路径

1. 提供或配置有效 OpenAI API key，或在 Open Design Settings / 环境变量中配置另一条可用图片 provider（例如 `OD_SENSEAUDIO_API_KEY`）；不要把密钥写进聊天或文档。
2. 让 Open Design daemon 正式启动时继承 `HTTP_PROXY` / `HTTPS_PROXY=http://127.0.0.1:17890`，或使用其它已验证可达的代理。
3. API key 和代理环境同时可用后，优先运行：
   ```powershell
   .\docs\games\mage-wars\design\generated\run-step1-runtime-board-imagegen.ps1 -Model gpt-image-2 -UseProxy -Force
   ```
4. 或更换 / 修复 Codex CLI build，使 `codex-gpt-image-2` 路线能写出 `$CODEX_HOME/generated_images/**/ig_*` 或 `call_*` 图片；已验证 `0.144.1` 与 `0.145.0-alpha.27` 当前都不能完成该落盘合同。
5. 生成成功后，必须新增随图 AI 审计文件，确认规则、素材链、少边框、隐藏信息和可复刻门禁全部 `PASS`，再打开给用户人工验收。
