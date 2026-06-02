"use strict";
const electron = require("electron");
const path = require("path");
const http = require("http");
const https = require("https");
const Store = require("electron-store");
const uuid = require("uuid");
const fs = require("fs");
const os = require("os");
const smolToml = require("smol-toml");
var ServiceType = /* @__PURE__ */ ((ServiceType2) => {
  ServiceType2["OPENAI"] = "openai";
  ServiceType2["CLAUDE"] = "claude";
  ServiceType2["DEEPSEEK"] = "deepseek";
  ServiceType2["GEMINI"] = "gemini";
  ServiceType2["QWEN"] = "qwen";
  ServiceType2["ZHIPU"] = "zhipu";
  ServiceType2["CUSTOM"] = "custom";
  return ServiceType2;
})(ServiceType || {});
function getDefaultProxyBaseUrl(port) {
  return `http://127.0.0.1:${port}`;
}
var ClientType = /* @__PURE__ */ ((ClientType2) => {
  ClientType2["CODEX"] = "codex";
  ClientType2["WORKBUDDY"] = "workbuddy";
  ClientType2["QORDER"] = "qorder";
  ClientType2["OPENCLAW"] = "openclaw";
  return ClientType2;
})(ClientType || {});
var ProxyStatus = /* @__PURE__ */ ((ProxyStatus2) => {
  ProxyStatus2["RUNNING"] = "running";
  ProxyStatus2["STOPPED"] = "stopped";
  ProxyStatus2["ERROR"] = "error";
  return ProxyStatus2;
})(ProxyStatus || {});
const DEFAULT_SETTINGS = {
  proxyPort: 8080,
  autoStartProxy: true,
  autoLaunch: false,
  language: "zh-CN",
  dataPath: "",
  loggingEnabled: true
};
var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
  ErrorCode2[ErrorCode2["PROXY_START_FAILED"] = 1001] = "PROXY_START_FAILED";
  ErrorCode2[ErrorCode2["PROXY_PORT_IN_USE"] = 1002] = "PROXY_PORT_IN_USE";
  ErrorCode2[ErrorCode2["PROXY_FORWARD_FAILED"] = 1003] = "PROXY_FORWARD_FAILED";
  ErrorCode2[ErrorCode2["PROXY_CONVERT_FAILED"] = 1004] = "PROXY_CONVERT_FAILED";
  ErrorCode2[ErrorCode2["CHANNEL_NOT_FOUND"] = 2001] = "CHANNEL_NOT_FOUND";
  ErrorCode2[ErrorCode2["CHANNEL_TEST_FAILED"] = 2002] = "CHANNEL_TEST_FAILED";
  ErrorCode2[ErrorCode2["CLIENT_NOT_DETECTED"] = 3001] = "CLIENT_NOT_DETECTED";
  ErrorCode2[ErrorCode2["CLIENT_CONFIG_READ_FAILED"] = 3002] = "CLIENT_CONFIG_READ_FAILED";
  ErrorCode2[ErrorCode2["CLIENT_CONFIG_WRITE_FAILED"] = 3003] = "CLIENT_CONFIG_WRITE_FAILED";
  ErrorCode2[ErrorCode2["CLIENT_BACKUP_FAILED"] = 3004] = "CLIENT_BACKUP_FAILED";
  ErrorCode2[ErrorCode2["ENCRYPTION_FAILED"] = 4001] = "ENCRYPTION_FAILED";
  ErrorCode2[ErrorCode2["DECRYPTION_FAILED"] = 4002] = "DECRYPTION_FAILED";
  ErrorCode2[ErrorCode2["STORE_READ_FAILED"] = 5001] = "STORE_READ_FAILED";
  ErrorCode2[ErrorCode2["STORE_WRITE_FAILED"] = 5002] = "STORE_WRITE_FAILED";
  return ErrorCode2;
})(ErrorCode || {});
class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
  /** 序列化为 IPC 传输格式 */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
  /** 从 IPC 传输格式反序列化 */
  static fromJSON(json) {
    return new AppError(json.code, json.message, json.details);
  }
}
function registerProxyHandlers(deps) {
  const { proxyServer: proxyServer2, channelStore: channelStore2, trayManager: trayManager2, getMainWindow } = deps;
  electron.ipcMain.handle("proxy:start", async (_event, args) => {
    try {
      await proxyServer2.start(args.port);
      const status = proxyServer2.getStatus();
      const win = getMainWindow();
      if (win) {
        win.webContents.send("proxy:status-changed", status);
      }
      trayManager2?.updateStatus(status);
      return { success: true, port: args.port };
    } catch (err) {
      if (err instanceof AppError) {
        return { success: false, error: err.toJSON() };
      }
      return { success: false, error: { code: ErrorCode.PROXY_START_FAILED, message: err.message } };
    }
  });
  electron.ipcMain.handle("proxy:stop", async () => {
    try {
      await proxyServer2.stop();
      const status = proxyServer2.getStatus();
      const win = getMainWindow();
      if (win) {
        win.webContents.send("proxy:status-changed", status);
      }
      trayManager2?.updateStatus(status);
      return { success: true };
    } catch (err) {
      return { success: false, error: { code: ErrorCode.PROXY_START_FAILED, message: err.message } };
    }
  });
  electron.ipcMain.handle("proxy:status", async () => {
    return proxyServer2.getStatus();
  });
  electron.ipcMain.handle("proxy:set-channel", async (_event, args) => {
    try {
      channelStore2.setActiveChannel(args.channelId);
      proxyServer2.setActiveChannel(args.channelId);
      const status = proxyServer2.getStatus();
      const win = getMainWindow();
      if (win) {
        win.webContents.send("proxy:status-changed", status);
      }
      return { success: true };
    } catch (err) {
      if (err instanceof AppError) {
        return { success: false, error: err.toJSON() };
      }
      return { success: false, error: { code: ErrorCode.PROXY_FORWARD_FAILED, message: err.message } };
    }
  });
}
function registerChannelHandlers(deps) {
  const { channelStore: channelStore2, keyVault: keyVault2 } = deps;
  electron.ipcMain.handle("channel:list", async () => {
    const channels = channelStore2.list();
    return channels.map((ch) => ({
      ...ch,
      apiKeyEncrypted: keyVault2.maskApiKey(keyVault2.decrypt(ch.apiKeyEncrypted))
    }));
  });
  electron.ipcMain.handle("channel:get", async (_event, args) => {
    const channel = channelStore2.get(args.id);
    if (!channel) {
      throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${args.id} 不存在`);
    }
    return {
      ...channel,
      apiKeyEncrypted: keyVault2.maskApiKey(keyVault2.decrypt(channel.apiKeyEncrypted))
    };
  });
  electron.ipcMain.handle("channel:create", async (_event, data) => {
    const apiKeyEncrypted = keyVault2.encrypt(data.apiKey);
    const channel = channelStore2.create({
      name: data.name,
      serviceType: data.serviceType,
      baseUrl: data.baseUrl,
      proxyBaseUrl: data.proxyBaseUrl,
      apiKeyEncrypted,
      models: data.models
    });
    return {
      ...channel,
      apiKeyEncrypted: keyVault2.maskApiKey(data.apiKey)
    };
  });
  electron.ipcMain.handle("channel:update", async (_event, args) => {
    const updateData = {};
    if (args.name !== void 0) updateData.name = args.name;
    if (args.serviceType !== void 0) updateData.serviceType = args.serviceType;
    if (args.baseUrl !== void 0) updateData.baseUrl = args.baseUrl;
    if (args.proxyBaseUrl !== void 0) updateData.proxyBaseUrl = args.proxyBaseUrl;
    if (args.models !== void 0) updateData.models = args.models;
    if (args.isActive !== void 0) updateData.isActive = args.isActive;
    if (args.apiKey) {
      updateData.apiKeyEncrypted = keyVault2.encrypt(args.apiKey);
    }
    const channel = channelStore2.update(args.id, updateData);
    return {
      ...channel,
      apiKeyEncrypted: keyVault2.maskApiKey(
        args.apiKey ?? keyVault2.decrypt(channel.apiKeyEncrypted)
      )
    };
  });
  electron.ipcMain.handle("channel:delete", async (_event, args) => {
    channelStore2.delete(args.id);
    return { success: true };
  });
  electron.ipcMain.handle("channel:test", async (_event, args) => {
    try {
      const channel = channelStore2.get(args.id);
      if (!channel) {
        return { success: false, latency: 0, models: [], error: "渠道不存在" };
      }
      const startTime = Date.now();
      const apiKey = keyVault2.decrypt(channel.apiKeyEncrypted);
      let testUrl = channel.baseUrl.replace(/\/+$/, "");
      if (channel.serviceType === "openai" || channel.serviceType === "deepseek" || channel.serviceType === "qwen" || channel.serviceType === "zhipu") {
        testUrl += "/v1/models";
      } else if (channel.serviceType === "claude") {
        return { success: true, latency: Date.now() - startTime, models: channel.models };
      } else {
        testUrl += "/v1/models";
      }
      const urlObj = new URL(testUrl);
      const protocol = urlObj.protocol === "https:" ? https : http;
      const result = await new Promise((resolve) => {
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 1e4
        };
        const req = protocol.request(options, (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const latency = Date.now() - startTime;
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString());
              const models = body.data?.map((m) => m.id) ?? channel.models;
              resolve({ success: res.statusCode === 200, latency, models });
            } catch {
              resolve({ success: res.statusCode === 200, latency, models: channel.models });
            }
          });
        });
        req.on("error", () => {
          resolve({ success: false, latency: Date.now() - startTime, models: [] });
        });
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, latency: Date.now() - startTime, models: [] });
        });
        req.end();
      });
      return result;
    } catch (err) {
      return { success: false, latency: 0, models: [], error: err.message };
    }
  });
}
function registerClientHandlers(deps) {
  const { clientAdapterRegistry: clientAdapterRegistry2, channelStore: channelStore2, keyVault: keyVault2, getMainWindow } = deps;
  electron.ipcMain.handle("client:list", async () => {
    return clientAdapterRegistry2.detectAll();
  });
  electron.ipcMain.handle("client:switch-channel", async (_event, args) => {
    try {
      const clientType = args.clientType;
      const adapter = clientAdapterRegistry2.get(clientType);
      const channel = channelStore2.get(args.channelId);
      if (!channel) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${args.channelId} 不存在`);
      }
      const apiKey = keyVault2.decrypt(channel.apiKeyEncrypted);
      const currentConfig = adapter.readConfig();
      adapter.backupConfig();
      const settingsStore2 = deps.settingsStore;
      const settings = settingsStore2.get();
      const proxyUrl = channel.proxyBaseUrl ?? getDefaultProxyBaseUrl(settings.proxyPort);
      adapter.writeConfig({
        apiBaseUrl: proxyUrl,
        apiKey,
        model: channel.models[0] ?? "",
        extra: currentConfig.extra
      });
      channelStore2.setActiveChannel(args.channelId);
      const win = getMainWindow();
      if (win) {
        win.webContents.send("client:config-changed", { clientType: args.clientType });
      }
      return { success: true, backupId: "" };
    } catch (err) {
      if (err instanceof AppError) {
        return { success: false, error: err.toJSON() };
      }
      return { success: false, error: { code: ErrorCode.CLIENT_CONFIG_WRITE_FAILED, message: err.message } };
    }
  });
  electron.ipcMain.handle("client:restore", async (_event, args) => {
    try {
      const adapter = clientAdapterRegistry2.get(args.clientType);
      adapter.restoreConfig(args.backupId);
      const win = getMainWindow();
      if (win) {
        win.webContents.send("client:config-changed", { clientType: args.clientType });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: { code: ErrorCode.CLIENT_BACKUP_FAILED, message: err.message } };
    }
  });
  electron.ipcMain.handle("client:backups", async (_event, args) => {
    try {
      const adapter = clientAdapterRegistry2.get(args.clientType);
      return adapter.listBackups();
    } catch (err) {
      return [];
    }
  });
}
function registerLogHandlers(deps) {
  const { logStore: logStore2 } = deps;
  electron.ipcMain.handle("log:list", async (_event, filters) => {
    return logStore2.list(filters);
  });
  electron.ipcMain.handle("log:clear", async () => {
    logStore2.clear();
    return { success: true };
  });
}
function registerSettingsHandlers(deps) {
  const { settingsStore: settingsStore2 } = deps;
  electron.ipcMain.handle("settings:get", async () => {
    return settingsStore2.get();
  });
  electron.ipcMain.handle("settings:update", async (_event, partial) => {
    return settingsStore2.update(partial);
  });
}
function registerIpcHandlers(deps) {
  electron.ipcMain.removeHandler("proxy:start");
  electron.ipcMain.removeHandler("proxy:stop");
  electron.ipcMain.removeHandler("proxy:status");
  electron.ipcMain.removeHandler("proxy:set-channel");
  electron.ipcMain.removeHandler("channel:list");
  electron.ipcMain.removeHandler("channel:get");
  electron.ipcMain.removeHandler("channel:create");
  electron.ipcMain.removeHandler("channel:update");
  electron.ipcMain.removeHandler("channel:delete");
  electron.ipcMain.removeHandler("channel:test");
  electron.ipcMain.removeHandler("client:list");
  electron.ipcMain.removeHandler("client:switch-channel");
  electron.ipcMain.removeHandler("client:restore");
  electron.ipcMain.removeHandler("client:backups");
  electron.ipcMain.removeHandler("log:list");
  electron.ipcMain.removeHandler("log:clear");
  electron.ipcMain.removeHandler("settings:get");
  electron.ipcMain.removeHandler("settings:update");
  registerProxyHandlers(deps);
  registerChannelHandlers(deps);
  registerClientHandlers(deps);
  registerLogHandlers(deps);
  registerSettingsHandlers(deps);
  console.log("IPC 处理器注册完成");
}
class RequestRouter {
  constructor(channelStore2) {
    this.channelStore = channelStore2;
  }
  /**
   * 根据请求路径和请求体路由到对应渠道
   * MVP 仅支持单活跃渠道模式
   */
  route(path2, body) {
    const channels = this.channelStore.list();
    const activeChannel = channels.find((ch) => ch.isActive);
    if (!activeChannel) {
      throw new AppError(ErrorCode.PROXY_FORWARD_FAILED, "没有活跃渠道，请先在渠道管理中激活一个渠道");
    }
    return activeChannel;
  }
  /**
   * 解析目标 API URL
   * 根据渠道的 baseUrl 和请求路径构建完整 URL
   *
   * 支持的路径：
   * - /v1/chat/completions — OpenAI Chat API
   * - /v1/responses — OpenAI Responses API（直通转发）
   * - 其他路径 — 按服务商类型映射或直通
   */
  resolveTargetUrl(channel, path2, body) {
    const baseUrl = channel.baseUrl.replace(/\/+$/, "");
    switch (channel.serviceType) {
      case ServiceType.OPENAI:
      case ServiceType.DEEPSEEK:
      case ServiceType.QWEN:
      case ServiceType.ZHIPU:
        return `${baseUrl}${path2}`;
      case ServiceType.CLAUDE:
        return `${baseUrl}/v1/messages`;
      case ServiceType.GEMINI: {
        const model = body?.model ?? "gemini-2.0-flash";
        return `${baseUrl}/v1beta/models/${model}:generateContent`;
      }
      default:
        return `${baseUrl}${path2}`;
    }
  }
}
class SSEForwarder {
  constructor(logStore2, keyVault2, settingsStore2) {
    this.logStore = logStore2;
    this.keyVault = keyVault2;
    this.settingsStore = settingsStore2;
  }
  /** 流式转发请求 */
  async forward(req, res, channel, body, converter, targetUrl, startTime) {
    const nativeRequest = converter.convertRequest(body);
    const apiKey = this.keyVault.decrypt(channel.apiKeyEncrypted);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    const forwardHeaders = {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    };
    if (channel.serviceType === "claude") {
      forwardHeaders["x-api-key"] = apiKey;
      forwardHeaders["anthropic-version"] = "2023-06-01";
    } else if (channel.serviceType === "gemini") ;
    else {
      forwardHeaders["Authorization"] = `Bearer ${apiKey}`;
    }
    return new Promise((resolve) => {
      const urlObj = new URL(targetUrl);
      const bodyStr = JSON.stringify(nativeRequest);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          ...forwardHeaders,
          "Content-Length": Buffer.byteLength(bodyStr)
        }
      };
      const protocol = urlObj.protocol === "https:" ? https : http;
      const upstreamReq = protocol.request(options, (upstreamRes) => {
        if (upstreamRes.statusCode && upstreamRes.statusCode >= 400) {
          const chunks = [];
          upstreamRes.on("data", (chunk) => chunks.push(chunk));
          upstreamRes.on("end", () => {
            const errorBody = Buffer.concat(chunks).toString("utf-8");
            if (!res.headersSent) {
              res.writeHead(upstreamRes.statusCode ?? 502, { "Content-Type": "application/json" });
            }
            res.end(errorBody);
            this.recordLog(channel, body, req, upstreamRes.statusCode ?? 502, startTime);
            resolve();
          });
          return;
        }
        let sseBuffer = "";
        upstreamRes.on("data", (chunk) => {
          sseBuffer += chunk.toString("utf-8");
          res.write(chunk);
        });
        upstreamRes.on("end", () => {
          res.end();
          const usage = this.extractUsageFromSSE(sseBuffer);
          this.recordLog(channel, body, req, 200, startTime, usage);
          resolve();
        });
        upstreamRes.on("error", (err) => {
          console.error("上游 SSE 响应错误:", err.message);
          res.end();
          this.recordLog(channel, body, req, 502, startTime);
          resolve();
        });
      });
      upstreamReq.on("error", (err) => {
        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
        }
        res.end(JSON.stringify({ error: { message: `SSE 转发失败: ${err.message}` } }));
        this.recordLog(channel, body, req, 502, startTime);
        resolve();
      });
      upstreamReq.write(bodyStr);
      upstreamReq.end();
    });
  }
  /** 记录请求日志 */
  recordLog(channel, body, req, statusCode, startTime, usage) {
    if (!this.settingsStore.get().loggingEnabled) return;
    const duration = Date.now() - startTime;
    this.logStore.add({
      channelId: channel.id,
      channelName: channel.name,
      model: body.model ?? "unknown",
      method: req.method ?? "POST",
      path: req.url ?? "/",
      statusCode,
      duration,
      usage
    });
  }
  /** 从 SSE 累积数据中提取 token usage
   *
   * SSE 格式示例（OpenAI）：
   *   data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}
   *
   * 遍历所有 "data:" 行，从最后一条包含 "usage" 的 JSON 中提取。
   */
  extractUsageFromSSE(buffer) {
    const lines = buffer.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.usage?.total_tokens != null) {
          return {
            promptTokens: parsed.usage.prompt_tokens ?? 0,
            completionTokens: parsed.usage.completion_tokens ?? 0,
            totalTokens: parsed.usage.total_tokens
          };
        }
      } catch {
      }
    }
    return void 0;
  }
}
function loggingMiddleware(req) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const method = req.method ?? "UNKNOWN";
  const url = req.url ?? "/";
  console.log(`[${timestamp}] ${method} ${url}`);
}
function errorMiddleware(err, req, res) {
  console.error(`代理请求错误 [${req.url}]:`, err.message);
  const statusCode = err instanceof AppError ? 502 : 500;
  const errorResponse = {
    error: {
      message: err.message,
      code: err instanceof AppError ? err.code : 500
    }
  };
  if (!res.headersSent) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
  }
  res.end(JSON.stringify(errorResponse));
}
class ProxyServer {
  constructor(channelStore2, logStore2, settingsStore2, converterRegistry2, keyVault2) {
    this.status = ProxyStatus.STOPPED;
    this.httpServer = null;
    this.activeChannelId = null;
    this.errorMessage = null;
    this.port = 8080;
    this.channelStore = channelStore2;
    this.logStore = logStore2;
    this.settingsStore = settingsStore2;
    this.converterRegistry = converterRegistry2;
    this.keyVault = keyVault2;
    this.router = new RequestRouter(channelStore2);
    this.sseForwarder = new SSEForwarder(logStore2, keyVault2, settingsStore2);
  }
  /** 启动代理服务器 */
  async start(port) {
    if (this.status === ProxyStatus.RUNNING) {
      return;
    }
    this.port = port;
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });
        this.httpServer.on("error", (err) => {
          if (err.code === "EADDRINUSE") {
            this.status = ProxyStatus.ERROR;
            this.errorMessage = `端口 ${port} 已被占用`;
            reject(new AppError(ErrorCode.PROXY_PORT_IN_USE, this.errorMessage));
          } else {
            this.status = ProxyStatus.ERROR;
            this.errorMessage = err.message;
            reject(new AppError(ErrorCode.PROXY_START_FAILED, err.message));
          }
        });
        this.httpServer.listen(port, "127.0.0.1", () => {
          this.status = ProxyStatus.RUNNING;
          this.errorMessage = null;
          resolve();
        });
      } catch (err) {
        this.status = ProxyStatus.ERROR;
        this.errorMessage = err.message;
        reject(new AppError(ErrorCode.PROXY_START_FAILED, this.errorMessage));
      }
    });
  }
  /** 停止代理服务器 */
  async stop() {
    if (!this.httpServer || this.status === ProxyStatus.STOPPED) {
      return;
    }
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }
      this.httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.status = ProxyStatus.STOPPED;
          this.httpServer = null;
          this.errorMessage = null;
          resolve();
        }
      });
    });
  }
  /** 重启代理服务器 */
  async restart() {
    await this.stop();
    await this.start(this.port);
  }
  /** 获取代理状态信息 */
  getStatus() {
    const activeChannel = this.activeChannelId ? this.channelStore.get(this.activeChannelId) : null;
    return {
      status: this.status,
      port: this.port,
      activeChannelId: this.activeChannelId,
      activeChannelName: activeChannel?.name ?? null,
      errorMessage: this.errorMessage
    };
  }
  /** 设置活跃渠道（同步更新 ChannelStore 的 isActive 标记） */
  setActiveChannel(channelId) {
    const channel = this.channelStore.get(channelId);
    if (!channel) {
      throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${channelId} 不存在`);
    }
    this.activeChannelId = channelId;
    this.channelStore.setActiveChannel(channelId);
  }
  /** 处理 HTTP 请求 */
  handleRequest(req, res) {
    const startTime = Date.now();
    loggingMiddleware(req);
    const bodyChunks = [];
    req.on("data", (chunk) => {
      bodyChunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const bodyRaw = Buffer.concat(bodyChunks).toString("utf-8");
        const body = bodyRaw ? JSON.parse(bodyRaw) : {};
        const channel = this.router.route(req.url ?? "/", body);
        const converter = this.converterRegistry.get(channel.serviceType);
        const targetUrl = this.router.resolveTargetUrl(channel, req.url ?? "/v1/chat/completions", body);
        const isStream = body.stream === true;
        if (isStream) {
          this.sseForwarder.forward(req, res, channel, body, converter, targetUrl, startTime).catch((err) => {
            errorMiddleware(err, req, res);
          });
        } else {
          this.forwardBuffered(req, res, channel, body, converter, targetUrl, startTime);
        }
      } catch (err) {
        errorMiddleware(err, req, res);
      }
    });
    req.on("error", (err) => {
      errorMiddleware(err, req, res);
    });
  }
  /** 缓冲式转发（非流式请求） */
  forwardBuffered(req, res, channel, body, converter, targetUrl, startTime) {
    const nativeRequest = converter.convertRequest(body);
    const apiKey = this.keyVault.decrypt(channel.apiKeyEncrypted);
    const forwardHeaders = {
      "Content-Type": "application/json"
    };
    if (channel.serviceType === "claude") {
      forwardHeaders["x-api-key"] = apiKey;
      forwardHeaders["anthropic-version"] = "2023-06-01";
    } else if (channel.serviceType === "gemini") ;
    else {
      forwardHeaders["Authorization"] = `Bearer ${apiKey}`;
    }
    this.forwardRequest(targetUrl, req.method ?? "POST", forwardHeaders, nativeRequest).then((responseBody) => {
      const openAIResponse = converter.convertResponse(responseBody);
      const usage = openAIResponse.usage ? {
        promptTokens: openAIResponse.usage.prompt_tokens,
        completionTokens: openAIResponse.usage.completion_tokens,
        totalTokens: openAIResponse.usage.total_tokens
      } : void 0;
      const responseStr = JSON.stringify(openAIResponse);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(responseStr)
      });
      res.end(responseStr);
      const duration = Date.now() - startTime;
      if (this.settingsStore.get().loggingEnabled) {
        this.logStore.add({
          channelId: channel.id,
          channelName: channel.name,
          model: body.model ?? "unknown",
          method: req.method ?? "POST",
          path: req.url ?? "/",
          statusCode: 200,
          duration,
          usage
        });
      }
    }).catch((err) => {
      errorMiddleware(err, req, res);
      const duration = Date.now() - startTime;
      if (this.settingsStore.get().loggingEnabled) {
        this.logStore.add({
          channelId: channel.id,
          channelName: channel.name,
          model: body.model ?? "unknown",
          method: req.method ?? "POST",
          path: req.url ?? "/",
          statusCode: 502,
          duration
        });
      }
    });
  }
  /** 转发 HTTP 请求到目标 API */
  forwardRequest(url, method, headers, body) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const bodyStr = JSON.stringify(body);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(bodyStr)
        }
      };
      const protocol = urlObj.protocol === "https:" ? https : http;
      const proxyReq = protocol.request(options, (proxyRes) => {
        const chunks = [];
        proxyRes.on("data", (chunk) => chunks.push(chunk));
        proxyRes.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf-8");
          try {
            const parsed = JSON.parse(responseBody);
            resolve(parsed);
          } catch {
            resolve({ raw: responseBody });
          }
        });
        proxyRes.on("error", reject);
      });
      proxyReq.on("error", (err) => {
        reject(new AppError(ErrorCode.PROXY_FORWARD_FAILED, `转发请求失败: ${err.message}`));
      });
      proxyReq.write(bodyStr);
      proxyReq.end();
    });
  }
}
class ChannelStore {
  constructor() {
    this.store = new Store({
      name: "config",
      defaults: {
        channels: []
      }
    });
  }
  /** 获取所有渠道 */
  list() {
    try {
      return this.store.get("channels", []);
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `读取渠道列表失败: ${err.message}`);
    }
  }
  /** 根据 ID 获取渠道 */
  get(id) {
    const channels = this.list();
    return channels.find((ch) => ch.id === id) ?? null;
  }
  /** 创建渠道 */
  create(data) {
    try {
      const channels = this.list();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const channel = {
        id: uuid.v4(),
        name: data.name,
        serviceType: data.serviceType,
        baseUrl: data.baseUrl,
        proxyBaseUrl: data.proxyBaseUrl ?? null,
        // null = 走本机代理
        apiKeyEncrypted: data.apiKeyEncrypted,
        models: data.models,
        isActive: false,
        createdAt: now,
        updatedAt: now
      };
      channels.push(channel);
      this.store.set("channels", channels);
      return channel;
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `创建渠道失败: ${err.message}`);
    }
  }
  /** 更新渠道 */
  update(id, data) {
    try {
      const channels = this.list();
      const index = channels.findIndex((ch) => ch.id === id);
      if (index === -1) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${id} 不存在`);
      }
      const existing = channels[index];
      const updated = {
        ...existing,
        name: data.name ?? existing.name,
        serviceType: data.serviceType ?? existing.serviceType,
        baseUrl: data.baseUrl ?? existing.baseUrl,
        proxyBaseUrl: data.proxyBaseUrl !== void 0 ? data.proxyBaseUrl : existing.proxyBaseUrl,
        apiKeyEncrypted: data.apiKeyEncrypted ?? existing.apiKeyEncrypted,
        models: data.models ?? existing.models,
        isActive: data.isActive ?? existing.isActive,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (updated.isActive) {
        channels.forEach((ch) => {
          ch.isActive = false;
        });
      }
      channels[index] = updated;
      this.store.set("channels", channels);
      return updated;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `更新渠道失败: ${err.message}`);
    }
  }
  /** 删除渠道 */
  delete(id) {
    try {
      const channels = this.list();
      const filtered = channels.filter((ch) => ch.id !== id);
      if (filtered.length === channels.length) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${id} 不存在`);
      }
      this.store.set("channels", filtered);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `删除渠道失败: ${err.message}`);
    }
  }
  /** 获取活跃渠道 */
  getActiveChannel() {
    const channels = this.list();
    return channels.find((ch) => ch.isActive) ?? null;
  }
  /** 设置活跃渠道 */
  setActiveChannel(id) {
    const channels = this.list();
    const target = channels.find((ch) => ch.id === id);
    if (!target) {
      throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${id} 不存在`);
    }
    channels.forEach((ch) => {
      ch.isActive = ch.id === id;
    });
    this.store.set("channels", channels);
  }
}
const MAX_LOG_COUNT = 1e4;
class LogStore {
  constructor() {
    this.store = new Store({
      name: "logs",
      defaults: {
        logs: []
      }
    });
  }
  /** 添加一条请求日志 */
  add(log) {
    try {
      const logs = this.store.get("logs", []);
      const newLog = {
        id: uuid.v4(),
        ...log
      };
      logs.unshift(newLog);
      if (logs.length > MAX_LOG_COUNT) {
        logs.splice(MAX_LOG_COUNT);
      }
      this.store.set("logs", logs);
      return newLog;
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `写入日志失败: ${err.message}`);
    }
  }
  /** 查询日志列表（支持筛选） */
  list(filters = {}) {
    try {
      let logs = this.store.get("logs", []);
      if (filters.channelId) {
        logs = logs.filter((log) => log.channelId === filters.channelId);
      }
      if (filters.statusCode) {
        logs = logs.filter((log) => log.statusCode === filters.statusCode);
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        logs = logs.filter((log) => new Date(log.timestamp).getTime() >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate).getTime();
        logs = logs.filter((log) => new Date(log.timestamp).getTime() <= end);
      }
      const offset = filters.offset ?? 0;
      const limit = filters.limit ?? logs.length;
      logs = logs.slice(offset, offset + limit);
      return logs;
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `查询日志失败: ${err.message}`);
    }
  }
  /** 清空所有日志 */
  clear() {
    try {
      this.store.set("logs", []);
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `清空日志失败: ${err.message}`);
    }
  }
  /** 获取日志统计信息 */
  getStats() {
    try {
      const logs = this.store.get("logs", []);
      const totalRequests = logs.length;
      const successCount = logs.filter((log) => log.statusCode >= 200 && log.statusCode < 300).length;
      const errorCount = totalRequests - successCount;
      const avgDuration = totalRequests > 0 ? Math.round(logs.reduce((sum, log) => sum + log.duration, 0) / totalRequests) : 0;
      return {
        totalRequests,
        successCount,
        errorCount,
        avgDuration
      };
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `获取日志统计失败: ${err.message}`);
    }
  }
}
class SettingsStore {
  constructor() {
    this.store = new Store({
      name: "config",
      defaults: {
        settings: DEFAULT_SETTINGS
      }
    });
  }
  /** 获取应用设置 */
  get() {
    try {
      return this.store.get("settings", DEFAULT_SETTINGS);
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `读取设置失败: ${err.message}`);
    }
  }
  /** 更新应用设置（部分更新） */
  update(partial) {
    try {
      const current = this.get();
      const updated = {
        ...current,
        ...partial
      };
      this.store.set("settings", updated);
      return updated;
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `更新设置失败: ${err.message}`);
    }
  }
  /** 重置为默认设置 */
  reset() {
    try {
      this.store.set("settings", DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `重置设置失败: ${err.message}`);
    }
  }
}
class BackupStore {
  constructor() {
    this.backupDir = path.join(electron.app.getPath("userData"), "backups");
    this.ensureBackupDir();
  }
  /** 确保备份目录存在 */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
  /** 创建配置备份 */
  create(clientId, content, filePath) {
    try {
      const clientBackupDir = path.join(this.backupDir, clientId);
      if (!fs.existsSync(clientBackupDir)) {
        fs.mkdirSync(clientBackupDir, { recursive: true });
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const fileName = `${timestamp}_${this.sanitizeFileName(filePath)}`;
      const backupFilePath = path.join(clientBackupDir, fileName);
      fs.writeFileSync(backupFilePath, content, "utf-8");
      const stats = fs.statSync(backupFilePath);
      const backup = {
        id: uuid.v4(),
        clientId,
        filePath,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        size: stats.size
      };
      const metaPath = path.join(clientBackupDir, `${fileName}.meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify(backup, null, 2), "utf-8");
      return backup;
    } catch (err) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, `创建备份失败: ${err.message}`);
    }
  }
  /** 获取指定客户端的备份列表 */
  list(clientId) {
    try {
      const clientBackupDir = path.join(this.backupDir, clientId);
      if (!fs.existsSync(clientBackupDir)) {
        return [];
      }
      const backups = [];
      const files = fs.readdirSync(clientBackupDir);
      for (const file of files) {
        if (file.endsWith(".meta.json")) {
          const metaPath = path.join(clientBackupDir, file);
          const metaContent = fs.readFileSync(metaPath, "utf-8");
          const backup = JSON.parse(metaContent);
          backups.push(backup);
        }
      }
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return backups;
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `读取备份列表失败: ${err.message}`);
    }
  }
  /** 获取指定备份记录 */
  get(backupId) {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return null;
      }
      const clientDirs = fs.readdirSync(this.backupDir);
      for (const clientDir of clientDirs) {
        const clientPath = path.join(this.backupDir, clientDir);
        if (!fs.statSync(clientPath).isDirectory()) continue;
        const files = fs.readdirSync(clientPath);
        for (const file of files) {
          if (file.endsWith(".meta.json")) {
            const metaContent = fs.readFileSync(path.join(clientPath, file), "utf-8");
            const backup = JSON.parse(metaContent);
            if (backup.id === backupId) {
              return backup;
            }
          }
        }
      }
      return null;
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `查找备份失败: ${err.message}`);
    }
  }
  /** 恢复指定备份 */
  restore(backupId) {
    try {
      const backup = this.get(backupId);
      if (!backup) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `备份 ${backupId} 不存在`);
      }
      const content = this.getContent(backupId);
      if (!content) {
        throw new AppError(ErrorCode.STORE_READ_FAILED, `备份内容为空`);
      }
      fs.writeFileSync(backup.filePath, content, "utf-8");
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `恢复备份失败: ${err.message}`);
    }
  }
  /** 获取备份的文件内容 */
  getContent(backupId) {
    try {
      const backup = this.get(backupId);
      if (!backup) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `备份 ${backupId} 不存在`);
      }
      const clientBackupDir = path.join(this.backupDir, backup.clientId);
      const files = fs.readdirSync(clientBackupDir);
      for (const file of files) {
        if (file.endsWith(".meta.json")) continue;
        const metaPath = path.join(clientBackupDir, `${file}.meta.json`);
        if (fs.existsSync(metaPath)) {
          const metaContent = fs.readFileSync(metaPath, "utf-8");
          const meta = JSON.parse(metaContent);
          if (meta.id === backupId) {
            return fs.readFileSync(path.join(clientBackupDir, file), "utf-8");
          }
        }
      }
      throw new AppError(ErrorCode.STORE_READ_FAILED, `未找到备份文件内容`);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.STORE_READ_FAILED, `读取备份内容失败: ${err.message}`);
    }
  }
  /** 清理文件名中的特殊字符 */
  sanitizeFileName(filePath) {
    return filePath.replace(/[\\/:*?"<>|]/g, "_");
  }
}
class KeyVault {
  /** 加密明文 API Key，返回 Base64 编码的密文 */
  encrypt(plaintext) {
    if (!plaintext) {
      throw new AppError(ErrorCode.ENCRYPTION_FAILED, "加密内容不能为空");
    }
    try {
      if (!electron.safeStorage.isEncryptionAvailable()) {
        throw new AppError(ErrorCode.ENCRYPTION_FAILED, "系统加密服务不可用");
      }
      const encryptedBuffer = electron.safeStorage.encryptString(plaintext);
      return encryptedBuffer.toString("base64");
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.ENCRYPTION_FAILED, `加密失败: ${err.message}`);
    }
  }
  /** 解密 Base64 编码的密文，返回明文 API Key */
  decrypt(ciphertext) {
    if (!ciphertext) {
      throw new AppError(ErrorCode.DECRYPTION_FAILED, "解密内容不能为空");
    }
    try {
      const encryptedBuffer = Buffer.from(ciphertext, "base64");
      return electron.safeStorage.decryptString(encryptedBuffer);
    } catch (err) {
      throw new AppError(ErrorCode.DECRYPTION_FAILED, `解密失败: ${err.message}`);
    }
  }
  /** 判断一个值是否为加密后的密文 */
  isEncrypted(value) {
    try {
      const buffer = Buffer.from(value, "base64");
      electron.safeStorage.decryptString(buffer);
      return true;
    } catch {
      return false;
    }
  }
  /** 脱敏 API Key — 仅显示前后 4 位 */
  maskApiKey(apiKey) {
    if (!apiKey || apiKey.length <= 8) {
      return "****";
    }
    const prefix = apiKey.substring(0, 4);
    const suffix = apiKey.substring(apiKey.length - 4);
    return `${prefix}****${suffix}`;
  }
}
class ConverterRegistry {
  constructor() {
    this.converters = /* @__PURE__ */ new Map();
  }
  /** 注册一个转换器 */
  register(converter) {
    this.converters.set(converter.serviceType, converter);
  }
  /** 获取指定服务类型的转换器 */
  get(serviceType) {
    const converter = this.converters.get(serviceType);
    if (!converter) {
      throw new AppError(
        ErrorCode.PROXY_CONVERT_FAILED,
        `未找到 ${serviceType} 类型的协议转换器`
      );
    }
    return converter;
  }
  /** 检查是否已注册指定类型的转换器 */
  has(serviceType) {
    return this.converters.has(serviceType);
  }
  /** 获取所有已注册的服务类型 */
  getRegisteredTypes() {
    return Array.from(this.converters.keys());
  }
}
class OpenAIConverter {
  constructor() {
    this.serviceType = ServiceType.OPENAI;
    this.supportsStreamingConversion = false;
  }
  convertRequest(req) {
    return req;
  }
  convertResponse(res) {
    return res;
  }
}
class ClaudeConverter {
  constructor() {
    this.serviceType = ServiceType.CLAUDE;
    this.supportsStreamingConversion = false;
  }
  convertRequest(req) {
    let systemPrompt;
    const messages = [];
    for (const msg of req.messages) {
      if (msg.role === "system") {
        systemPrompt = msg.content;
      } else if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    const result = {
      model: this.mapModelName(req.model),
      max_tokens: req.max_tokens ?? 4096,
      messages
    };
    if (systemPrompt) {
      result.system = systemPrompt;
    }
    if (req.temperature !== void 0) {
      result.temperature = req.temperature;
    }
    return result;
  }
  convertResponse(res) {
    const claudeRes = res;
    const textContent = claudeRes.content?.filter((block) => block.type === "text").map((block) => block.text).join("") ?? "";
    return {
      id: claudeRes.id ?? uuid.v4(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1e3),
      model: claudeRes.model ?? "claude",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: textContent
          },
          finish_reason: claudeRes.stop_reason === "end_turn" ? "stop" : claudeRes.stop_reason ?? "stop"
        }
      ],
      usage: claudeRes.usage ? {
        prompt_tokens: claudeRes.usage.input_tokens,
        completion_tokens: claudeRes.usage.output_tokens,
        total_tokens: claudeRes.usage.input_tokens + claudeRes.usage.output_tokens
      } : void 0
    };
  }
  /** 模型名称映射：OpenAI 格式 → Claude 原生格式 */
  mapModelName(model) {
    const modelMap = {
      "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
      "claude-3-5-haiku-20241022": "claude-3-5-haiku-20241022",
      "claude-3-5-sonnet-20241022": "claude-3-5-sonnet-20241022",
      "claude-3-opus": "claude-3-opus-20240229"
    };
    return modelMap[model] ?? model;
  }
}
class DeepSeekConverter {
  constructor() {
    this.serviceType = ServiceType.DEEPSEEK;
    this.supportsStreamingConversion = false;
  }
  convertRequest(req) {
    return {
      ...req,
      model: this.mapModelName(req.model)
    };
  }
  convertResponse(res) {
    return res;
  }
  /** 模型名称映射 */
  mapModelName(model) {
    const modelMap = {
      "deepseek-chat": "deepseek-chat",
      "deepseek-reasoner": "deepseek-reasoner",
      "gpt-4": "deepseek-chat",
      "gpt-4o": "deepseek-chat"
    };
    return modelMap[model] ?? model;
  }
}
class GeminiConverter {
  constructor() {
    this.serviceType = ServiceType.GEMINI;
    this.supportsStreamingConversion = false;
  }
  convertRequest(req) {
    const contents = [];
    for (const msg of req.messages) {
      const parts = [{ text: msg.content }];
      if (msg.role === "user") {
        contents.push({ role: "user", parts });
      } else if (msg.role === "assistant") {
        contents.push({ role: "model", parts });
      } else if (msg.role === "system") {
        contents.push({
          role: "user",
          parts: [{ text: `[System Instruction] ${msg.content}` }]
        });
      }
    }
    const result = {
      contents
    };
    if (req.temperature !== void 0 || req.max_tokens !== void 0 || req.top_p !== void 0) {
      result.generationConfig = {};
      if (req.temperature !== void 0) {
        result.generationConfig.temperature = req.temperature;
      }
      if (req.max_tokens !== void 0) {
        result.generationConfig.maxOutputTokens = req.max_tokens;
      }
      if (req.top_p !== void 0) {
        result.generationConfig.topP = req.top_p;
      }
    }
    return result;
  }
  convertResponse(res) {
    const geminiRes = res;
    const textContent = geminiRes.candidates?.[0]?.content?.parts?.filter((part) => part.text !== void 0).map((part) => part.text).join("") ?? "";
    const finishReason = geminiRes.candidates?.[0]?.finishReason ?? "stop";
    const mappedFinishReason = finishReason === "STOP" ? "stop" : finishReason.toLowerCase();
    return {
      id: uuid.v4(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1e3),
      model: "gemini",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: textContent
          },
          finish_reason: mappedFinishReason
        }
      ],
      usage: geminiRes.usageMetadata ? {
        prompt_tokens: geminiRes.usageMetadata.promptTokenCount ?? 0,
        completion_tokens: geminiRes.usageMetadata.candidatesTokenCount ?? 0,
        total_tokens: geminiRes.usageMetadata.totalTokenCount ?? 0
      } : void 0
    };
  }
}
class QwenConverter {
  constructor() {
    this.serviceType = ServiceType.QWEN;
    this.supportsStreamingConversion = false;
  }
  convertRequest(req) {
    return {
      ...req,
      model: this.mapModelName(req.model)
    };
  }
  convertResponse(res) {
    return res;
  }
  /** 模型名称映射 */
  mapModelName(model) {
    const modelMap = {
      "qwen-turbo": "qwen-turbo",
      "qwen-plus": "qwen-plus",
      "qwen-max": "qwen-max",
      "qwq-32b": "qwq-32b"
    };
    return modelMap[model] ?? model;
  }
}
class ZhipuConverter {
  constructor() {
    this.serviceType = ServiceType.ZHIPU;
    this.supportsStreamingConversion = false;
  }
  convertRequest(req) {
    return {
      ...req,
      model: this.mapModelName(req.model)
    };
  }
  convertResponse(res) {
    return res;
  }
  /** 模型名称映射 */
  mapModelName(model) {
    const modelMap = {
      "glm-4-plus": "glm-4-plus",
      "glm-4-flash": "glm-4-flash",
      "glm-4": "glm-4"
    };
    return modelMap[model] ?? model;
  }
}
class ClientAdapterRegistry {
  constructor() {
    this.adapters = /* @__PURE__ */ new Map();
    this.channelStore = null;
    this.settingsStore = null;
  }
  /** 注入 ChannelStore（用于匹配 linkedChannelId） */
  setChannelStore(store) {
    this.channelStore = store;
  }
  /** 注入 SettingsStore（用于计算本机代理地址匹配） */
  setSettingsStore(store) {
    this.settingsStore = store;
  }
  /** 注册一个客户端适配器 */
  register(adapter) {
    this.adapters.set(adapter.clientType, adapter);
  }
  /** 获取指定类型的适配器 */
  get(clientType) {
    const adapter = this.adapters.get(clientType);
    if (!adapter) {
      throw new AppError(ErrorCode.CLIENT_NOT_DETECTED, `未找到 ${clientType} 类型的客户端适配器`);
    }
    return adapter;
  }
  /** 检测所有已注册客户端的安装状态 */
  detectAll() {
    const results = [];
    for (const [clientType, adapter] of this.adapters) {
      const detected = adapter.detect();
      const configPaths = adapter.getConfigPaths();
      let currentConfig = null;
      if (detected) {
        try {
          currentConfig = adapter.readConfig();
        } catch {
        }
      }
      const clientNames = {
        [ClientType.CODEX]: "Codex CLI",
        [ClientType.WORKBUDDY]: "WorkBuddy",
        [ClientType.QORDER]: "Qorder",
        [ClientType.OPENCLAW]: "OpenClaw"
      };
      let linkedChannelId = null;
      if (detected && currentConfig && this.channelStore) {
        const channels = this.channelStore.list();
        const proxyPort = this.settingsStore?.get().proxyPort ?? 8080;
        const localProxyUrl = getDefaultProxyBaseUrl(proxyPort);
        const matched = channels.find((ch) => {
          if (ch.proxyBaseUrl) {
            return ch.proxyBaseUrl === currentConfig.apiBaseUrl;
          } else {
            return currentConfig.apiBaseUrl === localProxyUrl;
          }
        });
        if (matched) {
          linkedChannelId = matched.id;
        }
      }
      results.push({
        clientType,
        name: clientNames[clientType] ?? clientType,
        detected,
        configPaths,
        currentConfig,
        linkedChannelId
      });
    }
    return results;
  }
  /** 获取所有已注册的客户端类型 */
  getRegisteredTypes() {
    return Array.from(this.adapters.keys());
  }
}
class CodexAdapter {
  constructor() {
    this.clientType = ClientType.CODEX;
    const codexDir = path.join(os.homedir(), ".codex");
    this.configTomlPath = path.join(codexDir, "config.toml");
    this.authJsonPath = path.join(codexDir, "auth.json");
    this.backupStore = new BackupStore();
  }
  getConfigPaths() {
    return [this.configTomlPath, this.authJsonPath];
  }
  detect() {
    return fs.existsSync(this.configTomlPath) || fs.existsSync(this.authJsonPath);
  }
  readConfig() {
    try {
      let apiBaseUrl = "";
      let apiKey = "";
      let model = "";
      const extra = {};
      if (fs.existsSync(this.configTomlPath)) {
        const tomlContent = fs.readFileSync(this.configTomlPath, "utf-8");
        const parsed = smolToml.parse(tomlContent);
        const providers = parsed.model_providers ?? {};
        const activeProviderId = parsed.model_provider ?? "custom";
        const activeProvider = providers[activeProviderId] ?? {};
        apiBaseUrl = activeProvider.base_url ?? "";
        model = parsed.model ?? "";
        Object.assign(extra, { tomlData: parsed, activeProviderId });
      }
      if (fs.existsSync(this.authJsonPath)) {
        const authContent = fs.readFileSync(this.authJsonPath, "utf-8");
        const authParsed = JSON.parse(authContent);
        apiKey = authParsed.OPENAI_API_KEY ?? "";
        Object.assign(extra, { authData: authParsed });
      }
      return { apiBaseUrl, apiKey, model, extra };
    } catch (err) {
      throw new AppError(ErrorCode.CLIENT_CONFIG_READ_FAILED, `读取 Codex 配置失败: ${err.message}`);
    }
  }
  writeConfig(config) {
    try {
      const hasExistingConfig = this.getConfigPaths().some((p) => fs.existsSync(p));
      if (hasExistingConfig) {
        this.backupConfig();
      }
      let tomlData = {};
      if (fs.existsSync(this.configTomlPath)) {
        const tomlContent = fs.readFileSync(this.configTomlPath, "utf-8");
        tomlData = smolToml.parse(tomlContent);
      }
      if (config.model) {
        tomlData.model = config.model;
      }
      tomlData.model_provider = "custom";
      if (!tomlData.model_providers) {
        tomlData.model_providers = {};
      }
      if (!tomlData.model_providers.custom) {
        ;
        tomlData.model_providers.custom = {};
      }
      if (config.apiBaseUrl) {
        ;
        tomlData.model_providers.custom.base_url = config.apiBaseUrl;
      }
      ;
      tomlData.model_providers.custom.name = "custom";
      tomlData.model_providers.custom.wire_api = "responses";
      tomlData.model_providers.custom.requires_openai_auth = true;
      fs.writeFileSync(this.configTomlPath, smolToml.stringify(tomlData), "utf-8");
      let authData = {};
      if (fs.existsSync(this.authJsonPath)) {
        const authContent = fs.readFileSync(this.authJsonPath, "utf-8");
        authData = JSON.parse(authContent);
      }
      if (config.apiKey) {
        authData.OPENAI_API_KEY = config.apiKey;
        authData.auth_mode = "apikey";
      }
      fs.writeFileSync(this.authJsonPath, JSON.stringify(authData, null, 2), "utf-8");
    } catch (err) {
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `写入 Codex 配置失败: ${err.message}`);
    }
  }
  backupConfig() {
    const configPaths = this.getConfigPaths();
    const lastBackup = configPaths.filter((p) => fs.existsSync(p)).map((p) => {
      const content = fs.readFileSync(p, "utf-8");
      return this.backupStore.create(ClientType.CODEX, content, p);
    }).pop();
    if (!lastBackup) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, "没有可备份的 Codex 配置文件");
    }
    return lastBackup;
  }
  restoreConfig(backupId) {
    this.backupStore.restore(backupId);
  }
  listBackups() {
    return this.backupStore.list(ClientType.CODEX);
  }
}
class WorkBuddyAdapter {
  constructor() {
    this.clientType = ClientType.WORKBUDDY;
    this.modelsJsonPath = path.join(os.homedir(), ".workbuddy", "models.json");
    this.backupStore = new BackupStore();
  }
  getConfigPaths() {
    return [this.modelsJsonPath];
  }
  detect() {
    return fs.existsSync(this.modelsJsonPath);
  }
  readConfig() {
    try {
      if (!fs.existsSync(this.modelsJsonPath)) {
        throw new AppError(ErrorCode.CLIENT_NOT_DETECTED, "WorkBuddy 配置文件不存在");
      }
      const content = fs.readFileSync(this.modelsJsonPath, "utf-8");
      const models = JSON.parse(content);
      if (models.length === 0) {
        return { apiBaseUrl: "", apiKey: "", model: "", extra: { models: [] } };
      }
      const activeModel = models[0];
      return {
        apiBaseUrl: activeModel.url ?? "",
        apiKey: activeModel.apiKey ?? "",
        model: activeModel.id ?? "",
        extra: { models }
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.CLIENT_CONFIG_READ_FAILED, `读取 WorkBuddy 配置失败: ${err.message}`);
    }
  }
  writeConfig(config) {
    try {
      if (fs.existsSync(this.modelsJsonPath)) {
        this.backupConfig();
      }
      let models = [];
      if (fs.existsSync(this.modelsJsonPath)) {
        const content = fs.readFileSync(this.modelsJsonPath, "utf-8");
        models = JSON.parse(content);
      }
      if (models.length === 0) {
        models.push({
          id: config.model,
          name: config.model,
          vendor: "Custom",
          url: config.apiBaseUrl,
          apiKey: config.apiKey,
          supportsToolCall: true,
          supportsImages: true,
          supportsReasoning: true,
          useCustomProtocol: false,
          maxInputTokens: 262144,
          maxOutputTokens: 65536
        });
      } else {
        if (config.apiBaseUrl) models[0].url = config.apiBaseUrl;
        if (config.apiKey) models[0].apiKey = config.apiKey;
        if (config.model) {
          models[0].id = config.model;
          models[0].name = config.model;
        }
      }
      fs.writeFileSync(this.modelsJsonPath, JSON.stringify(models, null, 2), "utf-8");
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `写入 WorkBuddy 配置失败: ${err.message}`);
    }
  }
  backupConfig() {
    if (!fs.existsSync(this.modelsJsonPath)) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, "WorkBuddy 配置文件不存在");
    }
    const content = fs.readFileSync(this.modelsJsonPath, "utf-8");
    return this.backupStore.create(ClientType.WORKBUDDY, content, this.modelsJsonPath);
  }
  restoreConfig(backupId) {
    this.backupStore.restore(backupId);
  }
  listBackups() {
    return this.backupStore.list(ClientType.WORKBUDDY);
  }
}
class QorderAdapter {
  constructor() {
    this.clientType = ClientType.QORDER;
    this.configJsonPath = path.join(os.homedir(), ".qorder", "config.json");
    this.backupStore = new BackupStore();
  }
  getConfigPaths() {
    return [this.configJsonPath];
  }
  detect() {
    return fs.existsSync(this.configJsonPath);
  }
  readConfig() {
    try {
      if (!fs.existsSync(this.configJsonPath)) {
        throw new AppError(ErrorCode.CLIENT_NOT_DETECTED, "Qorder 配置文件不存在");
      }
      const content = fs.readFileSync(this.configJsonPath, "utf-8");
      const parsed = JSON.parse(content);
      const openai = parsed.openai ?? {};
      return {
        apiBaseUrl: openai.baseURL ?? "",
        apiKey: openai.apiKey ?? "",
        model: openai.model ?? "",
        extra: parsed
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.CLIENT_CONFIG_READ_FAILED, `读取 Qorder 配置失败: ${err.message}`);
    }
  }
  writeConfig(config) {
    try {
      this.backupConfig();
      let currentData = {};
      if (fs.existsSync(this.configJsonPath)) {
        const content = fs.readFileSync(this.configJsonPath, "utf-8");
        currentData = JSON.parse(content);
      }
      const openai = currentData.openai ?? {};
      if (config.apiBaseUrl) openai.baseURL = config.apiBaseUrl;
      if (config.apiKey) openai.apiKey = config.apiKey;
      if (config.model) openai.model = config.model;
      currentData.openai = openai;
      fs.writeFileSync(this.configJsonPath, JSON.stringify(currentData, null, 2), "utf-8");
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `写入 Qorder 配置失败: ${err.message}`);
    }
  }
  backupConfig() {
    if (!fs.existsSync(this.configJsonPath)) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, "Qorder 配置文件不存在");
    }
    const content = fs.readFileSync(this.configJsonPath, "utf-8");
    return this.backupStore.create(ClientType.QORDER, content, this.configJsonPath);
  }
  restoreConfig(backupId) {
    this.backupStore.restore(backupId);
  }
  listBackups() {
    return this.backupStore.list(ClientType.QORDER);
  }
}
class OpenClawAdapter {
  constructor() {
    this.clientType = ClientType.OPENCLAW;
    this.configJsonPath = path.join(electron.app.getPath("appData"), "openclaw", "config.json");
    this.backupStore = new BackupStore();
  }
  getConfigPaths() {
    return [this.configJsonPath];
  }
  detect() {
    return fs.existsSync(this.configJsonPath);
  }
  readConfig() {
    try {
      if (!fs.existsSync(this.configJsonPath)) {
        throw new AppError(ErrorCode.CLIENT_NOT_DETECTED, "OpenClaw 配置文件不存在");
      }
      const content = fs.readFileSync(this.configJsonPath, "utf-8");
      const parsed = JSON.parse(content);
      const provider = parsed.provider ?? {};
      return {
        apiBaseUrl: provider.endpoint ?? "",
        apiKey: provider.apiKey ?? "",
        model: provider.model ?? "",
        extra: parsed
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.CLIENT_CONFIG_READ_FAILED, `读取 OpenClaw 配置失败: ${err.message}`);
    }
  }
  writeConfig(config) {
    try {
      this.backupConfig();
      let currentData = {};
      if (fs.existsSync(this.configJsonPath)) {
        const content = fs.readFileSync(this.configJsonPath, "utf-8");
        currentData = JSON.parse(content);
      }
      const provider = currentData.provider ?? {};
      if (config.apiBaseUrl) provider.endpoint = config.apiBaseUrl;
      if (config.apiKey) provider.apiKey = config.apiKey;
      if (config.model) provider.model = config.model;
      currentData.provider = provider;
      fs.writeFileSync(this.configJsonPath, JSON.stringify(currentData, null, 2), "utf-8");
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `写入 OpenClaw 配置失败: ${err.message}`);
    }
  }
  backupConfig() {
    if (!fs.existsSync(this.configJsonPath)) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, "OpenClaw 配置文件不存在");
    }
    const content = fs.readFileSync(this.configJsonPath, "utf-8");
    return this.backupStore.create(ClientType.OPENCLAW, content, this.configJsonPath);
  }
  restoreConfig(backupId) {
    this.backupStore.restore(backupId);
  }
  listBackups() {
    return this.backupStore.list(ClientType.OPENCLAW);
  }
}
const TRAY_ICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGNwa9pCU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULAHAR8EweQtBOAAAAAElFTkSuQmCC";
class TrayManager {
  constructor(proxyServer2, showWindow) {
    this.tray = null;
    this.proxyServer = proxyServer2;
    this.showWindow = showWindow;
  }
  /** 创建系统托盘 */
  create() {
    const icon = electron.nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`);
    this.tray = new electron.Tray(icon);
    this.tray.setToolTip("Codex-Switch");
    this.tray.on("click", () => {
      this.showWindow();
    });
    this.tray.on("right-click", () => {
      this.updateMenu();
    });
    this.updateMenu();
  }
  /** 更新托盘菜单（根据代理状态动态生成） */
  updateStatus(status) {
    if (!this.tray) return;
    const statusText = status.status === ProxyStatus.RUNNING ? `● 运行中 (端口: ${status.port})` : status.status === ProxyStatus.ERROR ? "● 异常" : "○ 已停止";
    this.tray.setToolTip(`Codex-Switch - ${statusText}`);
    this.updateMenu();
  }
  /** 更新托盘菜单 */
  updateMenu() {
    if (!this.tray) return;
    const status = this.proxyServer.getStatus();
    const isRunning = status.status === ProxyStatus.RUNNING;
    const contextMenu = electron.Menu.buildFromTemplate([
      {
        label: isRunning ? "代理运行中" : "代理已停止",
        enabled: false
      },
      { type: "separator" },
      {
        label: isRunning ? "停止代理" : "启动代理",
        click: async () => {
          try {
            if (isRunning) {
              await this.proxyServer.stop();
            } else {
              await this.proxyServer.start(status.port || 8080);
            }
            this.updateMenu();
          } catch (err) {
            console.error("切换代理状态失败:", err);
          }
        }
      },
      { type: "separator" },
      {
        label: "显示主窗口",
        click: () => {
          this.showWindow();
        }
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          electron.app.quit();
        }
      }
    ]);
    this.tray.setContextMenu(contextMenu);
  }
  /** 销毁托盘 */
  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
let mainWindow = null;
let proxyServer = null;
let trayManager = null;
let isQuitting = false;
let keyVault;
let channelStore;
let logStore;
let settingsStore;
let backupStore;
let converterRegistry;
let clientAdapterRegistry;
function initConverters() {
  converterRegistry.register(new OpenAIConverter());
  converterRegistry.register(new ClaudeConverter());
  converterRegistry.register(new DeepSeekConverter());
  converterRegistry.register(new GeminiConverter());
  converterRegistry.register(new QwenConverter());
  converterRegistry.register(new ZhipuConverter());
}
function initClientAdapters() {
  clientAdapterRegistry.register(new CodexAdapter());
  clientAdapterRegistry.register(new WorkBuddyAdapter());
  clientAdapterRegistry.register(new QorderAdapter());
  clientAdapterRegistry.register(new OpenClawAdapter());
}
function createMainWindow() {
  const win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    titleBarStyle: "default",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const rendererPath = electron.app.isPackaged ? path.join(process.resourcesPath, "renderer/index.html") : path.join(__dirname, "../renderer/index.html");
    win.loadFile(rendererPath);
  }
  win.on("closed", () => {
    mainWindow = null;
  });
  win.on("close", (event) => {
    if (!isQuitting && process.platform !== "darwin") {
      event.preventDefault();
      win.hide();
    }
  });
  win.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  win.webContents.on("before-input-event", (_event, input) => {
    if (input.key === "F12") {
      win.webContents.toggleDevTools();
    }
  });
  return win;
}
electron.app.whenReady().then(() => {
  keyVault = new KeyVault();
  channelStore = new ChannelStore();
  logStore = new LogStore();
  settingsStore = new SettingsStore();
  backupStore = new BackupStore();
  converterRegistry = new ConverterRegistry();
  clientAdapterRegistry = new ClientAdapterRegistry();
  initConverters();
  initClientAdapters();
  clientAdapterRegistry.setChannelStore(channelStore);
  clientAdapterRegistry.setSettingsStore(settingsStore);
  proxyServer = new ProxyServer(
    channelStore,
    logStore,
    settingsStore,
    converterRegistry,
    keyVault
  );
  mainWindow = createMainWindow();
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  registerIpcHandlers({
    proxyServer,
    channelStore,
    logStore,
    settingsStore,
    backupStore,
    keyVault,
    converterRegistry,
    clientAdapterRegistry,
    trayManager,
    getMainWindow: () => mainWindow
  });
  trayManager = new TrayManager(proxyServer, () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      mainWindow = createMainWindow();
    }
  });
  trayManager.create();
  const settings = settingsStore.get();
  if (settings.autoStartProxy && proxyServer) {
    proxyServer.start(settings.proxyPort).then(() => {
      trayManager?.updateStatus(proxyServer.getStatus());
    }).catch((err) => {
      console.error("自动启动代理失败:", err);
    });
  }
  const clientInfos = clientAdapterRegistry.detectAll();
  console.log(`检测到 ${clientInfos.filter((c) => c.detected).length} 个已安装客户端`);
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});
electron.app.on("window-all-closed", () => {
});
electron.app.on("before-quit", async () => {
  isQuitting = true;
  if (proxyServer) {
    await proxyServer.stop();
  }
  if (trayManager) {
    trayManager.destroy();
  }
});
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
