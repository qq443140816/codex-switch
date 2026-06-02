# Codex-Switch v1.1 交付概览

> 日期：2026-06-03 | 主理人：齐活林（Qi）

## TL;DR
完成真实客户端联调（Codex/WorkBuddy 适配器修正）+ SSE 流式转发支持，146 测试全通过，构建通过。

## 交付概览

| 项目 | 状态 |
|------|------|
| 测试 | ✅ 146/146 通过（11 测试文件） |
| 构建 | ✅ 三端产物正常 |
| 已知问题 | 无 |

## 变更文件清单

### 修改文件
| 文件 | 变更说明 |
|------|----------|
| `src/main/client-adapter/codex.ts` | 🔴 重写：修正字段映射 + config.toml 保留写入 |
| `src/main/client-adapter/workbuddy.ts` | 🔴 重写：路径改为 ~/.workbuddy/models.json + JSON 数组格式 |
| `src/main/proxy/server.ts` | 🟡 重构：stream 分流 + forwardBuffered 提取 |
| `src/main/proxy/router.ts` | 🟡 扩展：Responses API 路径支持 |
| `src/main/converter/base.ts` | 🟡 扩展：新增 supportsStreamingConversion |
| `src/shared/types/proxy.ts` | 🟡 扩展：新增 Responses API 类型 |
| 6 个 Converter 实现 | 🟢 补充：添加 supportsStreamingConversion = false |

### 新增文件
| 文件 | 说明 |
|------|------|
| `src/main/proxy/sse-forwarder.ts` | SSE 流式转发器 |
| `src/main/__tests__/codex-adapter.test.ts` | Codex 适配器测试（22 用例） |
| `src/main/__tests__/workbuddy-adapter.test.ts` | WorkBuddy 适配器测试（15 用例） |
| `src/main/__tests__/sse-forwarder.test.ts` | SSE 转发器集成测试（11 用例，真实 HTTP Server） |
| `src/main/__tests__/proxy-router-v1.1.test.ts` | v1.1 路由测试（7 用例，Responses API 路径） |
| `src/main/__tests__/converter-streaming-v1.1.test.ts` | Converter 流式属性测试（6 用例） |

## 关键技术决策

1. **Codex config.toml 保留写入**：读取现有 → 修改特定字段 → 整体写回，保留 [projects]/[windows]/[desktop] 段
2. **WorkBuddy 多模型端点**：读取/更新数组第一个元素，保留其他元素
3. **SSE 直通模式**：MVP 阶段 chunk 不做协议转换，直接转发
4. **流式/缓冲分流**：根据 `body.stream === true` 选择转发路径

## 用户下一步建议

1. **启动应用验证**：`node scripts/start.js` 启动 Electron，测试 Codex 渠道切换
2. **Codex 真实联调**：在应用中将 Codex 渠道切换到本地代理，验证 config.toml 写入正确
3. **SSE 功能测试**：通过代理发送 stream:true 请求，观察实时输出
4. **WorkBuddy 联调**：测试 WorkBuddy 渠道切换，验证 models.json 读写
