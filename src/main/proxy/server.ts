import http from 'http'
import https from 'https'
import { IncomingMessage, ServerResponse, Server } from 'http'
import { ProxyStatus, ProxyStatusInfo, OpenAIChatRequest, OpenAIChatResponse, Channel } from '../../shared/types'
import { RequestRouter } from './router'
import { SSEForwarder } from './sse-forwarder'
import { loggingMiddleware, errorMiddleware } from './middleware'
import { ChannelStore } from '../store/channel-store'
import { LogStore } from '../store/log-store'
import { SettingsStore } from '../store/settings-store'
import { ConverterRegistry } from '../converter/registry'
import { KeyVault } from '../crypto/key-vault'
import { AppError, ErrorCode } from '../../shared/types'
import type { IProtocolConverter } from '../converter/base'

/** HTTP 代理服务器 */
export class ProxyServer {
  private port: number
  private status: ProxyStatus = ProxyStatus.STOPPED
  private httpServer: Server | null = null
  private activeChannelId: string | null = null
  private readonly router: RequestRouter
  private readonly sseForwarder: SSEForwarder
  private readonly channelStore: ChannelStore
  private readonly logStore: LogStore
  private readonly settingsStore: SettingsStore
  private readonly converterRegistry: ConverterRegistry
  private readonly keyVault: KeyVault
  private errorMessage: string | null = null

  constructor(
    channelStore: ChannelStore,
    logStore: LogStore,
    settingsStore: SettingsStore,
    converterRegistry: ConverterRegistry,
    keyVault: KeyVault
  ) {
    this.port = 8080
    this.channelStore = channelStore
    this.logStore = logStore
    this.settingsStore = settingsStore
    this.converterRegistry = converterRegistry
    this.keyVault = keyVault
    this.router = new RequestRouter(channelStore)
    this.sseForwarder = new SSEForwarder(logStore, keyVault, settingsStore)
  }

  /** 启动代理服务器 */
  async start(port: number): Promise<void> {
    if (this.status === ProxyStatus.RUNNING) {
      return
    }

    this.port = port

    return new Promise((resolve, reject) => {
      try {
        this.httpServer = http.createServer((req, res) => {
          this.handleRequest(req, res)
        })

        this.httpServer.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            this.status = ProxyStatus.ERROR
            this.errorMessage = `端口 ${port} 已被占用`
            reject(new AppError(ErrorCode.PROXY_PORT_IN_USE, this.errorMessage))
          } else {
            this.status = ProxyStatus.ERROR
            this.errorMessage = err.message
            reject(new AppError(ErrorCode.PROXY_START_FAILED, err.message))
          }
        })

        this.httpServer.listen(port, '127.0.0.1', () => {
          this.status = ProxyStatus.RUNNING
          this.errorMessage = null
          resolve()
        })
      } catch (err) {
        this.status = ProxyStatus.ERROR
        this.errorMessage = (err as Error).message
        reject(new AppError(ErrorCode.PROXY_START_FAILED, this.errorMessage))
      }
    })
  }

  /** 停止代理服务器 */
  async stop(): Promise<void> {
    if (!this.httpServer || this.status === ProxyStatus.STOPPED) {
      return
    }

    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve()
        return
      }

      this.httpServer.close((err) => {
        if (err) {
          reject(err)
        } else {
          this.status = ProxyStatus.STOPPED
          this.httpServer = null
          this.errorMessage = null
          resolve()
        }
      })
    })
  }

  /** 重启代理服务器 */
  async restart(): Promise<void> {
    await this.stop()
    await this.start(this.port)
  }

  /** 获取代理状态信息 */
  getStatus(): ProxyStatusInfo {
    const activeChannel = this.activeChannelId
      ? this.channelStore.get(this.activeChannelId)
      : null

    return {
      status: this.status,
      port: this.port,
      activeChannelId: this.activeChannelId,
      activeChannelName: activeChannel?.name ?? null,
      errorMessage: this.errorMessage,
    }
  }

  /** 设置活跃渠道（同步更新 ChannelStore 的 isActive 标记） */
  setActiveChannel(channelId: string): void {
    const channel = this.channelStore.get(channelId)
    if (!channel) {
      throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${channelId} 不存在`)
    }
    this.activeChannelId = channelId
    // 同步更新 Store 中的 isActive 标记，Router 依赖此字段路由
    this.channelStore.setActiveChannel(channelId)
  }

  /** 处理 HTTP 请求 */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const startTime = Date.now()

    // 应用日志中间件
    loggingMiddleware(req)

    // 收集请求体
    const bodyChunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      bodyChunks.push(chunk)
    })

    req.on('end', () => {
      try {
        const bodyRaw = Buffer.concat(bodyChunks).toString('utf-8')
        const body = bodyRaw ? JSON.parse(bodyRaw) : {}

        // 路由请求到活跃渠道
        const channel = this.router.route(req.url ?? '/', body)

        // 获取协议转换器
        const converter = this.converterRegistry.get(channel.serviceType)

        // 解析目标 URL
        const targetUrl = this.router.resolveTargetUrl(channel, req.url ?? '/v1/chat/completions', body)

        // 根据 stream 字段分流：流式走 SSEForwarder，非流式走缓冲转发
        const isStream = (body as OpenAIChatRequest).stream === true

        if (isStream) {
          this.sseForwarder
            .forward(req, res, channel, body as OpenAIChatRequest, converter, targetUrl, startTime)
            .catch((err: Error) => {
              errorMiddleware(err, req, res)
            })
        } else {
          this.forwardBuffered(req, res, channel, body as OpenAIChatRequest, converter, targetUrl, startTime)
        }
      } catch (err) {
        errorMiddleware(err as Error, req, res)
      }
    })

    req.on('error', (err) => {
      errorMiddleware(err, req, res)
    })
  }

  /** 缓冲式转发（非流式请求） */
  private forwardBuffered(
    req: IncomingMessage,
    res: ServerResponse,
    channel: Channel,
    body: OpenAIChatRequest,
    converter: IProtocolConverter,
    targetUrl: string,
    startTime: number
  ): void {
    // 转换请求格式
    const nativeRequest = converter.convertRequest(body)

    // 解密 API Key
    const apiKey = this.keyVault.decrypt(channel.apiKeyEncrypted)

    // 构建转发请求头
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // 不同服务商的认证方式不同
    if (channel.serviceType === 'claude') {
      forwardHeaders['x-api-key'] = apiKey
      forwardHeaders['anthropic-version'] = '2023-06-01'
    } else if (channel.serviceType === 'gemini') {
      // Gemini 使用 URL 参数传递 Key
      // 目标 URL 已在 resolveTargetUrl 中处理
    } else {
      // OpenAI 兼容格式：Bearer Token
      forwardHeaders['Authorization'] = `Bearer ${apiKey}`
    }

    // 转发请求到目标 API
    this.forwardRequest(targetUrl, req.method ?? 'POST', forwardHeaders, nativeRequest)
      .then((responseBody) => {
        // 逆向转换响应格式
        const openAIResponse = converter.convertResponse(responseBody)

        // 提取 token 用量
        const usage = openAIResponse.usage
          ? {
              promptTokens: openAIResponse.usage.prompt_tokens,
              completionTokens: openAIResponse.usage.completion_tokens,
              totalTokens: openAIResponse.usage.total_tokens,
            }
          : undefined

        const responseStr = JSON.stringify(openAIResponse)
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(responseStr),
        })
        res.end(responseStr)

        // 记录请求日志
        const duration = Date.now() - startTime
        if (this.settingsStore.get().loggingEnabled) {
          this.logStore.add({
            channelId: channel.id,
            channelName: channel.name,
            model: body.model ?? 'unknown',
            method: req.method ?? 'POST',
            path: req.url ?? '/',
            statusCode: 200,
            duration,
            usage,
          })
        }
      })
      .catch((err) => {
        errorMiddleware(err, req, res)

        // 记录错误日志
        const duration = Date.now() - startTime
        if (this.settingsStore.get().loggingEnabled) {
          this.logStore.add({
            channelId: channel.id,
            channelName: channel.name,
            model: body.model ?? 'unknown',
            method: req.method ?? 'POST',
            path: req.url ?? '/',
            statusCode: 502,
            duration,
          })
        }
      })
  }

  /** 转发 HTTP 请求到目标 API */
  private forwardRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: unknown
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url)
      const bodyStr = JSON.stringify(body)

      const options: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      }

      const protocol = urlObj.protocol === 'https:' ? https : http
      const proxyReq = protocol.request(options, (proxyRes: IncomingMessage) => {
        const chunks: Buffer[] = []
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk))
        proxyRes.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf-8')
          try {
            const parsed = JSON.parse(responseBody)
            resolve(parsed)
          } catch {
            // 非 JSON 响应，返回原始文本包装
            resolve({ raw: responseBody })
          }
        })
        proxyRes.on('error', reject)
      })

      proxyReq.on('error', (err: Error) => {
        reject(new AppError(ErrorCode.PROXY_FORWARD_FAILED, `转发请求失败: ${err.message}`))
      })

      proxyReq.write(bodyStr)
      proxyReq.end()
    })
  }
}
