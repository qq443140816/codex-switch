<div align="center">

# Codex-Switch

**一体化 AI 模型代理网关 & 客户端配置管理**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28+-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-146%20passed-success)]()

[English](#english) · [中文文档](#中文文档)

</div>

---

<a id="english"></a>

## 🤔 Why Codex-Switch?

If you use multiple AI coding tools (Codex CLI, WorkBuddy, Cursor, etc.) and multiple LLM providers (OpenAI, Claude, DeepSeek, Gemini, Qwen, Zhipu), you know the pain:

- **Switching providers** means manually editing config files for each tool
- **API keys scattered** across multiple config files, no unified management
- **No visibility** into which provider your tool is actually calling
- **Protocol differences** between providers (OpenAI vs Anthropic vs Google) cause compatibility issues

**Codex-Switch solves all of this** with a local proxy gateway + one-click client configuration management.

## ✨ Features

### 🔄 Local Proxy Gateway
- Acts as a **local API proxy** (`http://127.0.0.1:8080`) that sits between your AI tools and LLM providers
- **Protocol conversion** — automatically translates between OpenAI / Anthropic / Google / DeepSeek / Qwen / Zhipu API formats
- **SSE streaming** — real-time streaming responses with direct passthrough mode
- **Responses API** — supports `/v1/responses` route for Codex CLI

### 🔌 One-Click Client Configuration
- **Auto-detect** installed AI clients (Codex CLI, WorkBuddy)
- **One-click switch** — change the LLM provider for any client without manually editing config files
- **Auto-backup** — original config files are backed up before any change
- **Restore** — revert to any previous config backup with one click

### 📊 Dashboard & Monitoring
- Real-time proxy status (running/stopped, port, active channel)
- Request logs with latency tracking
- Channel connectivity testing

### 🔐 Security
- API keys encrypted with **Electron safeStorage** (Windows DPAPI / macOS Keychain)
- All data stored locally — **nothing sent to external servers**
- Config backups with size tracking

### 🖥️ System Integration
- System tray icon — control proxy without opening the main window
- Auto-start proxy on app launch
- Auto-launch on system startup

## 🚀 Quick Start (For Users)

### Installation

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| Windows | `Codex-Switch-Setup-{version}.exe` |
| macOS | `Codex-Switch-{version}.dmg` |
| Linux | `Codex-Switch-{version}.AppImage` |

### First-Time Setup (3 Steps)

1. **Launch Codex-Switch** — the proxy starts automatically on port 8080
2. **Add a Channel** — go to "渠道管理" → click "添加渠道" → select a template (e.g., OpenAI) → fill in your API key → click "创建"
3. **Switch your Client** — go to "客户端配置" → select a channel from the dropdown → click "切换到此渠道"

That's it! Your AI client (Codex CLI, WorkBuddy, etc.) will now route all requests through Codex-Switch.

> 💡 **Tip**: Leave the "代理 API 地址" field empty in channel settings to use the local proxy (recommended). Fill it in only if you want to bypass the proxy and connect directly to an API endpoint.

### Supported AI Clients

| Client | Config Location | Status |
|--------|----------------|--------|
| [Codex CLI](https://github.com/openai/codex) | `~/.codex/config.toml` + `~/.codex/auth.json` | ✅ Verified |
| [WorkBuddy](https://workbuddy.cn/) | `~/.workbuddy/models.json` | ✅ Verified |
| Qorder | Planned | 🔜 Coming |
| OpenClaw | Planned | 🔜 Coming |

### Supported LLM Providers

| Provider | Service Type | Base URL |
|----------|-------------|----------|
| OpenAI | `openai` | `https://api.openai.com` |
| Anthropic Claude | `claude` | `https://api.anthropic.com` |
| DeepSeek | `deepseek` | `https://api.deepseek.com` |
| Google Gemini | `gemini` | `https://generativelanguage.googleapis.com` |
| 通义千问 (Qwen) | `qwen` | `https://dashscope.aliyuncs.com/compatible-mode` |
| 智谱 (Zhipu) | `zhipu` | `https://open.bigmodel.cn/api/paas` |
| Custom | `custom` | User-defined |

## 🛠️ Development (For Contributors)

### Prerequisites

- **Node.js** >= 18
- **yarn** (recommended) or npm
- **Git**

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/codex-switch.git
cd codex-switch

# Install dependencies (use yarn to avoid Windows EBUSY issues)
yarn install

# Start development mode (hot-reload for renderer)
yarn dev

# Or build and run production
yarn start
```

### Project Structure

```
codex-switch/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── proxy/               # HTTP proxy engine
│   │   │   ├── server.ts        # ProxyServer (buffered + SSE forwarding)
│   │   │   ├── router.ts        # RequestRouter (service type dispatch)
│   │   │   ├── middleware.ts    # Request/response middleware
│   │   │   └── sse-forwarder.ts # SSE streaming passthrough
│   │   ├── converter/           # Protocol converters (Strategy pattern)
│   │   │   ├── base.ts          # IProtocolConverter interface
│   │   │   ├── openai.ts        # OpenAI ↔ standard format
│   │   │   ├── claude.ts        # Anthropic ↔ standard format
│   │   │   ├── deepseek.ts      # DeepSeek (OpenAI-compatible)
│   │   │   ├── gemini.ts        # Google Gemini ↔ standard format
│   │   │   ├── qwen.ts          # Qwen (OpenAI-compatible)
│   │   │   ├── zhipu.ts         # Zhipu (OpenAI-compatible)
│   │   │   └── registry.ts      # ConverterRegistry
│   │   ├── client-adapter/      # Client config adapters (Adapter pattern)
│   │   │   ├── base.ts          # IClientAdapter interface
│   │   │   ├── codex.ts         # Codex CLI adapter (config.toml + auth.json)
│   │   │   ├── workbuddy.ts     # WorkBuddy adapter (models.json)
│   │   │   ├── qorder.ts        # Qorder adapter (placeholder)
│   │   │   ├── openclaw.ts      # OpenClaw adapter (placeholder)
│   │   │   └── registry.ts      # ClientAdapterRegistry
│   │   ├── store/               # Data persistence (electron-store)
│   │   │   ├── channel-store.ts # Channel CRUD + active channel
│   │   │   ├── settings-store.ts# App settings
│   │   │   ├── log-store.ts     # Request logs
│   │   │   └── backup-store.ts  # Config backups
│   │   ├── crypto/              # API key encryption
│   │   │   └── key-vault.ts     # Electron safeStorage wrapper
│   │   ├── ipc/                 # IPC handlers (18 invoke + 3 push)
│   │   ├── tray/                # System tray manager
│   │   └── index.ts             # Main entry point
│   ├── preload/                 # Preload script (context bridge)
│   ├── renderer/                # React frontend
│   │   ├── pages/               # Dashboard, Channels, ClientConfig, Logs, Settings
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── theme/               # MUI theme configuration
│   │   └── utils/               # IPC bridge, formatters
│   └── shared/                  # Shared types (main ↔ renderer)
│       └── types/               # Channel, Client, Proxy, Settings, Log, IPC
├── scripts/                     # Build & launch scripts
├── electron.vite.config.ts      # electron-vite configuration
└── package.json
```

### Architecture Highlights

| Component | Pattern | Description |
|-----------|---------|-------------|
| Protocol Converter | Strategy | `IProtocolConverter` + `ConverterRegistry` — pluggable provider adapters |
| Client Adapter | Adapter | `IClientAdapter` + `ClientAdapterRegistry` — pluggable tool adapters |
| Proxy Engine | — | Node.js `http` module, buffered + SSE streaming dispatch |
| Key Management | — | `Electron.safeStorage` → OS-native encryption (DPAPI/Keychain) |
| IPC | — | `ipcMain.handle` / `ipcRenderer.invoke` — type-safe channels |

### Running Tests

```bash
# Run all tests
yarn test

# Watch mode
yarn test:watch
```

### Building

```bash
# Build for current platform
yarn build

# Package (unpacked directory)
yarn pack

# Distributable installer
yarn dist
```

### Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes** and add tests
4. **Run tests**: `yarn test`
5. **Submit a Pull Request**

**Areas where we need help**:

- 🌐 **More client adapters** — Cursor, Continue, Cline, Aider, etc.
- 🔌 **More protocol converters** — Mistral, Cohere, etc.
- 🖥️ **macOS/Linux testing** — currently only tested on Windows
- 🌍 **Internationalization** — help translate the UI
- 📖 **Documentation** — improve guides and API docs
- 🐛 **Bug reports** — file issues with reproduction steps

### Adding a New Client Adapter

1. Create `src/main/client-adapter/your-client.ts` implementing `IClientAdapter`
2. Register it in `src/main/index.ts` → `initClientAdapters()`
3. Add the `ClientType` enum value in `src/shared/types/client.ts`
4. Write tests in `src/main/__tests__/your-client-adapter.test.ts`

### Adding a New Protocol Converter

1. Create `src/main/converter/your-provider.ts` implementing `IProtocolConverter`
2. Register it in `src/main/index.ts` → `initConverters()`
3. Add the `ServiceType` enum value in `src/shared/types/channel.ts`
4. Write tests in `src/main/__tests__/your-provider-converter.test.ts`

## 📝 License

[MIT](LICENSE) © Codex-Switch Contributors

---

<a id="中文文档"></a>

## 中文文档

### 🤔 为什么需要 Codex-Switch？

如果你同时使用多个 AI 编程工具（Codex CLI、WorkBuddy、Cursor 等）和多个大模型供应商（OpenAI、Claude、DeepSeek、Gemini、通义千问、智谱），你一定遇到过这些问题：

- **切换供应商** = 手动编辑每个工具的配置文件
- **API Key 分散**在多个配置文件中，无法统一管理
- **不知道**你的工具实际在调用哪个供应商
- **协议差异**（OpenAI vs Anthropic vs Google）导致兼容性问题

**Codex-Switch 通过本地代理网关 + 一键客户端配置管理解决所有问题。**

### ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🔄 本地代理网关 | 在 AI 工具和大模型供应商之间做代理，自动协议转换 |
| 🔌 一键切换 | 一键切换客户端的 LLM 供应商，无需手动改配置文件 |
| 📊 实时监控 | 仪表盘显示代理状态、请求日志、延迟追踪 |
| 🔐 安全加密 | API Key 使用系统级加密存储（Windows DPAPI / macOS Keychain） |
| 💾 自动备份 | 切换前自动备份原配置，一键回滚 |
| 🖥️ 系统集成 | 系统托盘、开机自启、代理自启 |

### 🚀 快速上手（3 步开始使用）

**第 1 步：启动 Codex-Switch**

下载安装包，启动后代理默认在 `8080` 端口自动运行。

**第 2 步：添加渠道**

进入「渠道管理」→ 点击「添加渠道」→ 选择模板（如 OpenAI）→ 填写 API Key → 点击「创建」

**第 3 步：切换客户端**

进入「客户端配置」→ 在下拉框选择目标渠道 → 点击「切换到此渠道」

> 💡 代理 API 地址**留空即可**（走本机代理转发），只有需要绕过代理直连时才填写。

### 支持的客户端

| 客户端 | 配置位置 | 状态 |
|--------|---------|------|
| [Codex CLI](https://github.com/openai/codex) | `~/.codex/config.toml` | ✅ 已验证 |
| [WorkBuddy](https://workbuddy.cn/) | `~/.workbuddy/models.json` | ✅ 已验证 |
| Qorder | — | 🔜 计划中 |
| OpenClaw | — | 🔜 计划中 |

### 支持的大模型供应商

OpenAI · Anthropic Claude · DeepSeek · Google Gemini · 通义千问 · 智谱 · 自定义

### 🛠️ 开发者贡献

```bash
git clone https://github.com/YOUR_USERNAME/codex-switch.git
cd codex-switch
yarn install
yarn dev        # 开发模式（热更新）
yarn test       # 运行测试
yarn build      # 构建
```

**欢迎贡献的方向**：

- 🌐 更多客户端适配器（Cursor、Continue、Cline、Aider 等）
- 🔌 更多协议转换器（Mistral、Cohere 等）
- 🖥️ macOS / Linux 测试适配
- 🌍 国际化翻译
- 📖 文档完善
- 🐛 Bug 反馈

详细开发指南见 [English section](#english)。

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star！**

</div>
