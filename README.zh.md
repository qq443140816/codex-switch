<div align="center">

# Codex-Switch

**AI 大模型统一代理网关 & 客户端配置一键切换工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28+-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-146%20passed-success)]()

</div>

---

## 🔍 这是什么？

Codex-Switch 是一个 **Electron 桌面应用**，解决 AI 开发者的核心痛点：

> 用多个 AI 编程工具 + 多个大模型 API 时，切换供应商要手动改配置，API Key 分散难管理，协议不兼容频繁踩坑。

**一句话说明**：本地起一个代理网关，自动做协议转换；一键切换客户端配置，无需手动编辑文件。

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🔄 **本地代理网关** | `http://127.0.0.1:8080`，AI 工具的请求经本机代理转发到目标供应商 |
| 🔀 **自动协议转换** | OpenAI / Claude / DeepSeek / Gemini / 通义千问 / 智谱格式互转 |
| 📡 **SSE 流式转发** | 实时流式响应直通，支持 Codex CLI 的 Responses API |
| 🔌 **一键切换客户端** | 自动检测已安装的 AI 客户端，一键切换目标供应商 |
| 💾 **配置自动备份** | 切换前自动备份，一键回滚到任意历史配置 |
| 🔐 **API Key 加密** | 系统级加密存储（Windows DPAPI / macOS Keychain） |
| 📊 **实时监控** | 代理状态、请求日志、延迟追踪 |
| 🖥️ **系统集成** | 托盘图标、开机自启、代理自启 |

## 🚀 3 步上手

### 第 1 步：启动应用

下载安装包 → 启动 → 代理默认在 `8080` 端口自动运行

### 第 2 步：添加渠道

「渠道管理」→「添加渠道」→ 选择模板（如 OpenAI）→ 填写 API Key →「创建」

> 代理 API 地址**留空**即可走本机代理转发，不需要手动填写。

### 第 3 步：切换客户端

「客户端配置」→ 选择目标渠道 →「切换到此渠道」→ 完成！

## 📋 支持的客户端

| 客户端 | 配置文件 | 状态 |
|--------|---------|------|
| [Codex CLI](https://github.com/openai/codex)（OpenAI 官方命令行） | `~/.codex/config.toml` + `auth.json` | ✅ 已验证 |
| [WorkBuddy](https://workbuddy.cn/)（AI 编程助手） | `~/.workbuddy/models.json` | ✅ 已验证 |
| Qorder | — | 🔜 计划中 |
| OpenClaw | — | 🔜 计划中 |

**欢迎贡献更多客户端适配器！**（Cursor、Continue、Cline、Aider 等）

## 📋 支持的大模型供应商

| 供应商 | Service Type | API 地址 |
|--------|-------------|----------|
| OpenAI | `openai` | `https://api.openai.com` |
| Anthropic Claude | `claude` | `https://api.anthropic.com` |
| DeepSeek | `deepseek` | `https://api.deepseek.com` |
| Google Gemini | `gemini` | `https://generativelanguage.googleapis.com` |
| 通义千问 | `qwen` | `https://dashscope.aliyuncs.com/compatible-mode` |
| 智谱 GLM | `zhipu` | `https://open.bigmodel.cn/api/paas` |
| 自定义 | `custom` | 用户自定义 |

## 🏗️ 架构设计

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AI 客户端   │────▶│  Codex-Switch    │────▶│  大模型供应商    │
│ (Codex/WB)  │     │  本地代理网关     │     │ (OpenAI/Claude) │
└─────────────┘     │                  │     └─────────────────┘
                    │  ┌────────────┐  │
                    │  │ 协议转换器  │  │    策略模式
                    │  │ (6种供应商) │  │    IProtocolConverter
                    │  └────────────┘  │
                    │  ┌────────────┐  │
                    │  │ 客户端适配  │  │    适配器模式
                    │  │ (自动检测)  │  │    IClientAdapter
                    │  └────────────┘  │
                    │  ┌────────────┐  │
                    │  │ Key 加密    │  │    Electron safeStorage
                    │  │ (系统级)    │  │    Windows DPAPI
                    │  └────────────┘  │
                    └──────────────────┘
```

## 🛠️ 开发者指南

### 环境要求

- Node.js >= 18
- yarn（推荐，Windows 下 npm 有 EBUSY 问题）

### 本地开发

```bash
git clone https://gitee.com/YOUR_USERNAME/codex-switch.git
cd codex-switch
yarn install
yarn dev        # 开发模式（热更新）
yarn test       # 运行 146 个测试
yarn build      # 构建
yarn dist       # 打包安装程序
```

### 项目结构

```
src/
├── main/                    # Electron 主进程
│   ├── proxy/               # 代理引擎（HTTP 代理 + SSE 流式转发）
│   ├── converter/           # 协议转换器（6 种供应商，策略模式）
│   ├── client-adapter/      # 客户端适配器（自动检测 + 配置读写）
│   ├── store/               # 数据持久化（electron-store）
│   ├── crypto/              # API Key 加密（safeStorage）
│   ├── ipc/                 # IPC 通信（18 invoke + 3 push 通道）
│   └── tray/                # 系统托盘
├── preload/                 # 预加载脚本（context bridge）
├── renderer/                # React 前端（MUI + Tailwind CSS）
│   ├── pages/               # 5 个页面：仪表盘/渠道/客户端/日志/设置
│   ├── components/          # 可复用组件
│   └── hooks/               # 自定义 Hooks
└── shared/types/            # 共享类型定义（主进程 ↔ 渲染进程）
```

### 添加新的客户端适配器

1. 创建 `src/main/client-adapter/your-client.ts`，实现 `IClientAdapter` 接口
2. 在 `src/main/index.ts` 的 `initClientAdapters()` 中注册
3. 在 `src/shared/types/client.ts` 中添加 `ClientType` 枚举值
4. 编写测试 `src/main/__tests__/your-client-adapter.test.ts`

### 添加新的协议转换器

1. 创建 `src/main/converter/your-provider.ts`，实现 `IProtocolConverter` 接口
2. 在 `src/main/index.ts` 的 `initConverters()` 中注册
3. 在 `src/shared/types/channel.ts` 中添加 `ServiceType` 枚举值
4. 编写测试 `src/main/__tests__/your-provider-converter.test.ts`

### 贡献指南

1. **Fork** 本仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 编写代码和测试
4. 运行测试：`yarn test`（确保 146 个测试全部通过）
5. 提交 Pull Request

**我们特别需要以下贡献**：

| 方向 | 说明 | 难度 |
|------|------|------|
| 🌐 更多客户端适配器 | Cursor、Continue、Cline、Aider 等 | ⭐⭐ |
| 🔌 更多协议转换器 | Mistral、Cohere、百川、月之暗面等 | ⭐⭐ |
| 🖥️ macOS/Linux 适配 | 目前仅在 Windows 上测试 | ⭐⭐⭐ |
| 🌍 国际化 | 帮助翻译 UI 为英文/日文等 | ⭐ |
| 📖 文档 | 使用教程、API 文档、架构说明 | ⭐ |
| 🐛 Bug 反馈 | 提交 Issue 并附重现步骤 | ⭐ |

## 🔑 关键词（SEO）

`AI代理` `大模型网关` `LLM代理` `API代理` `OpenAI代理` `Claude代理` `DeepSeek代理` `Gemini代理` `通义千问代理` `智谱代理` `Codex CLI配置` `WorkBuddy配置` `AI客户端管理` `LLM协议转换` `SSE流式转发` `API Key管理` `AI工具切换` `模型代理网关` `Electron桌面应用` `TypeScript`

## 📄 开源协议

[MIT](LICENSE) © Codex-Switch Contributors

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star！有问题欢迎提 Issue！**

</div>
