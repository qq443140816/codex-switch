# Codex-Switch 项目记忆

## 项目概述
整合 CCX Desktop（API网关代理）+ CC Switch（配置管理）的 Electron 桌面应用，供 Codex/WorkBuddy/Qorder/OpenClaw 对接国内外大模型。

## 技术栈
Electron 28+ / React 18 / MUI 5 / Tailwind CSS 3 / TypeScript 5 / electron-vite 2.x / electron-store 8 / smol-toml / vitest

## 核心架构
- 代理引擎：Node.js 内置 http 模块，缓冲转发（MVP 不支持 SSE）
- 协议转换：策略模式 IProtocolConverter + ConverterRegistry（OpenAI/Claude/DeepSeek/Gemini/Qwen/Zhipu）
- 客户端适配：适配器模式 IClientAdapter + ClientAdapterRegistry（Codex/WorkBuddy/Qorder/OpenClaw）
- 加密：Electron safeStorage（Windows DPAPI）
- IPC：18 invoke 通道（R→M）+ 3 事件推送通道（M→R）

## 文件结构
src/main/（proxy/converter/client-adapter/store/crypto/ipc/tray）+ src/preload/ + src/renderer/（pages/components/hooks/contexts/utils）+ src/shared/types/

## 已知待确认
- WorkBuddy/Qorder/OpenClaw 配置路径和格式为假设值
- Codex config.toml 字段名待确认
- Claude/Gemini 协议转换细节（system message、tool_calls）

## 开发状态
v1.1 增量开发完成：Codex 适配器修正（model_providers.custom.base_url + OPENAI_API_KEY）、WorkBuddy 适配器修正（~/.workbuddy/models.json JSON数组）、SSE 流式转发（SSEForwarder 直通模式）、Responses API 路由。146 测试全通过（11 测试文件），构建通过。

## 真实客户端配置（已验证）
- **Codex CLI v0.134.0**：~/.codex/config.toml → model_providers.custom.base_url；~/.codex/auth.json → OPENAI_API_KEY + auth_mode；wire_api="responses"
- **WorkBuddy**：~/.workbuddy/models.json → JSON 数组 [{id, name, url, apiKey, vendor, supportsToolCall, ...}]

## 架构关键决策
- SSE 流式转发采用直通模式（chunk 不做协议转换），根据 body.stream 分流
- ProxyServer 构造函数注入 SSEForwarder(channelStore, logStore, settingsStore, converterRegistry, keyVault)
- SSEForwarder 构造函数注入 (logStore, keyVault, settingsStore)
- 日志记录受 settings.loggingEnabled 开关控制，关闭后 ProxyServer + SSEForwarder 均跳过 logStore.add()
- 仪表盘 RecentLogs 显示最新 1000 条记录（原 10 条），时间格式改为 YYYY-MM-DD HH:MM:SS
- writeConfig 在文件不存在时跳过 backupConfig() 调用
- 托盘关闭：点击 X → 隐藏到托盘（isQuitting 标志区分真正退出），left-click 显示主窗口，right-click 菜单含退出/显示

## 沙盒环境关键知识
- **ELECTRON_RUN_AS_NODE=1** 是沙盒默认设置，会导致 Electron 以 Node.js 模式启动（require('electron') 返回路径字符串）。必须清除该变量后 Electron 才能以 GUI 模式运行
- **启动命令**：`env -u ELECTRON_RUN_AS_NODE NODE_OPTIONS="" node_modules/electron/dist/electron.exe .` 或 `node scripts/start.js`
- **npm EBUSY**：Windows 文件锁导致 npm 无法 rename electron 目录，用 yarn 安装可绕过
- **Electron 镜像**：.npmrc 中配置 `electron_mirror=https://npmmirror.com/mirrors/electron/`
- **Store 延迟初始化**：所有依赖 app.getPath() 的 Store/KeyVault 必须在 app.whenReady() 后创建，不能在模块顶层 new
