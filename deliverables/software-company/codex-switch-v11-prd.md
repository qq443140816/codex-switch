# Codex-Switch v1.1 增量 PRD

> 版本：v1.1 | 产品经理：Xu | 日期：2026-06-03

---

## 1. 增量背景

v1.0.0 MVP 已完成（85 测试全通过、构建通过、Electron 启动验证成功）。经真实客户端联调验证，发现两类关键问题需要解决。

---

## 2. 增量需求池

### P0 — Must Have

| ID | 需求 | 说明 | 影响文件 |
|----|------|------|----------|
| P0-01 | **修正 Codex 适配器字段映射** | 当前适配器使用 `api_base_url` / `api_key` 等错误字段名，需改为 `model_providers.<id>.base_url` / `OPENAI_API_KEY` 等真实字段 | `src/main/client-adapter/codex.ts` |
| P0-02 | **Codex config.toml 写入时保留现有段** | `writeConfig()` 当前覆盖整个文件，丢失 `[projects]`/`[windows]`/`[desktop]` 等用户配置 | `src/main/client-adapter/codex.ts` |
| P0-03 | **Codex model_provider 联动** | 切换渠道时需同步更新 `model_provider` 字段指向正确的 provider ID | `src/main/client-adapter/codex.ts` |
| P0-04 | **修正 WorkBuddy 适配器路径和格式** | 当前读取 `%APPDATA%/workbuddy/settings.json`，实际应为 `~/.workbuddy/models.json`，且格式为 JSON 数组 | `src/main/client-adapter/workbuddy.ts` |
| P0-05 | **SSE 流式转发支持** | 代理引擎需支持 `stream: true` 请求的实时 chunk 转发，兼容 OpenAI Chat Completions 和 Responses API 的 SSE 协议 | `src/main/proxy/server.ts`, `src/main/converter/base.ts`, `src/main/proxy/streaming.ts`(新增) |
| P0-06 | **Responses API 路由** | Codex CLI 使用 `wire_api: "responses"` 协议，代理需支持 `/v1/responses` 路径的路由和转发 | `src/main/proxy/router.ts` |

### P1 — Should Have

| ID | 需求 | 说明 | 影响文件 |
|----|------|------|----------|
| P1-01 | **流式协议转换** | Claude/Gemini 等非 OpenAI 格式的流式 chunk 也需要实时转换 | `src/main/converter/*.ts` |
| P1-02 | **WorkBuddy 多模型端点管理** | `models.json` 是数组格式，支持多个模型端点，需正确管理 | `src/main/client-adapter/workbuddy.ts` |

---

## 3. 真实客户端配置格式（调研结果）

### 3.1 Codex CLI（v0.134.0）

**配置路径**（✅ 路径正确）：
- `~/.codex/config.toml`
- `~/.codex/auth.json`

**config.toml 真实格式**：
```toml
model_provider = "custom"
model = "gpt-5.2"
model_reasoning_effort = "medium"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "http://localhost:3668/v1"

[projects.'c:\users\hubber']
trust_level = "trusted"

[windows]
sandbox = "elevated"

[desktop]
conversationDetailMode = "STEPS_COMMANDS"
localeOverride = "zh-CN"
```

**auth.json 真实格式**：
```json
{
  "OPENAI_API_KEY": "RedFox",
  "auth_mode": "apikey"
}
```

**关键发现**：
- API Base URL 在 `[model_providers.<id>].base_url`（嵌套 TOML 表），不是顶层 `api_base_url`
- API Key 在 `auth.json` 的 `OPENAI_API_KEY` 字段，不是 `api_key`
- `model_provider` 字段决定使用哪个 provider 段
- `wire_api = "responses"` 表示使用 Responses API 协议
- `requires_openai_auth = true` 表示使用 OpenAI 风格认证头

### 3.2 WorkBuddy / CodeBuddy

**配置路径**（❌ 当前代码错误）：
- 当前：`%APPDATA%/workbuddy/settings.json`
- 实际：`~/.workbuddy/models.json`

**models.json 真实格式**：
```json
[
  {
    "id": "gpt-5.2",
    "name": "gpt-5.2",
    "vendor": "Custom",
    "url": "http://localhost:3000/v1",
    "apiKey": "RedFox",
    "supportsToolCall": true,
    "supportsImages": true,
    "supportsReasoning": true,
    "useCustomProtocol": false,
    "maxInputTokens": 262144,
    "maxOutputTokens": 65536
  }
]
```

**关键发现**：
- 格式为 JSON 数组（支持多模型端点）
- API Base URL 字段：`url`（非 `api.baseUrl`）
- API Key 字段：`apiKey`（非 `api.key`）
- 模型标识：`id` / `name`
- 供应商：`vendor`

---

## 4. SSE 流式转发需求分析

### 4.1 当前问题

当前代理引擎 `forwardRequest()` 采用**缓冲转发**模式：
1. 接收完整请求体 → 2. 转换 → 3. 转发 → 4. **等待完整响应** → 5. 逆向转换 → 6. 返回客户端

**问题**：
- 客户端发送 `stream: true` 时代理无法实时转发 SSE chunk
- 用户等待时间长，无法获得实时打字体验
- Codex CLI 使用 Responses API（`wire_api: "responses"`），需要支持 `/v1/responses` 路径

### 4.2 目标行为

**流式转发模式**：
1. 接收完整请求体 → 2. 转换 → 3. 转发 → 4. **实时转发 SSE chunk** → 5. 客户端实时接收

**兼容性**：
- `stream: false` → 保持原有缓冲转发
- `stream: true` → SSE 流式转发
- OpenAI 兼容格式直通（OpenAI/DeepSeek/Qwen/Zhipu）：chunk 直接转发
- Claude/Gemini 格式：chunk 实时转换后转发（P1 优先级）

### 4.3 SSE 数据格式

**OpenAI Chat Completions SSE**：
```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234,"model":"gpt-5.2","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: [DONE]
```

**OpenAI Responses API SSE**：
```
data: {"type":"response.output_item.done","output_index":0,"item":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Hello"}]}}

data: {"type":"response.completed","response":{"id":"resp_xxx","status":"completed",...}}

data: [DONE]
```

---

## 5. 变更影响分析

| 模块 | 变更类型 | 说明 |
|------|----------|------|
| `src/main/client-adapter/codex.ts` | 🔴 重写 | 字段映射修复 + config.toml 保留写入 |
| `src/main/client-adapter/workbuddy.ts` | 🔴 重写 | 路径修正 + models.json 数组格式支持 |
| `src/main/proxy/server.ts` | 🟡 重构 | 新增流式转发路径，区分 stream/非 stream |
| `src/main/proxy/router.ts` | 🟡 修改 | 新增 `/v1/responses` 路由支持 |
| `src/main/proxy/streaming.ts` | 🟢 新增 | SSE 流式转发器 |
| `src/main/converter/base.ts` | 🟡 修改 | 新增流式转换接口方法 |
| `src/shared/types/proxy.ts` | 🟡 修改 | 新增 Responses API 类型定义 |
| `src/main/__tests__/` | 🟢 新增 | 新增测试用例 |

---

## 6. 待确认问题

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| Q1 | Qorder 和 OpenClaw 的真实配置路径和格式？ | 适配器仍为假设值 | 暂不修改，用户使用时再验证 |
| Q2 | Codex 切换渠道时，是否需要创建新的 `[model_providers.<id>]` 段？ | config.toml 写入策略 | 建议始终使用 `custom` provider ID，更新其 `base_url` |
| Q3 | Responses API 的完整 SSE 事件类型列表？ | 流式转换实现细节 | 先支持直通模式（OpenAI 兼容渠道），后续再添加转换 |
