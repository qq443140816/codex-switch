import http from 'http'
import https from 'https'
import { IncomingMessage, ServerResponse } from 'http'
import { Channel, OpenAIChatRequest, AppError, ErrorCode } from '../../shared/types'
import { LogStore } from '../store/log-store'
import { SettingsStore } from '../store/settings-store'
import { KeyVault } from '../crypto/key-vault'
import type { IProtocolConverter } from '../converter/base'

/** SSE 流式转发器
 *
 * 当请求体包含 stream: true 时，代理引擎使用此类进行实时 SSE chunk 转发。
 * MVP 阶段采用直通模式：上游 SSE chunk 直接转发到客户端，不做 chunk 级协议转换。
 */
export class SSEForwarder {
  constructor(
    private readonly logStore: LogStore,
    private readonly keyVault: KeyVault,
    private readonly settingsStore: SettingsStore
  ) {}

  /** 流式转发请求 */
  async forward(
    req: IncomingMessage,
    res: ServerResponse,
    channel: Channel,
    body: OpenAIChatRequest,
    converter: IProtocolConverter,
    targetUrl: string,
    startTime: number
  ): Promise<void> {
    // 1. 转换请求体（仅请求级转换，chunk 级不转换）
    const nativeRequest = converter.convertRequest(body)
    const apiKey = this.keyVault.decrypt(channel.apiKeyEncrypted)

    // 2. 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    // 3. 构建转发请求头
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    }

    if (channel.serviceType === 'claude') {
      forwardHeaders['x-api-key'] = apiKey
      forwardHeaders['anthropic-version'] = '2023-06-01'
    } else if (channel.serviceType === 'gemini') {
      // Gemini 使用 URL 参数传递 Key，已在 resolveTargetUrl 中处理
    } else {
      // OpenAI 兼容格式：Bearer Token
      forwardHeaders['Authorization'] = `Bearer ${apiKey}`
    }

    // 4. 发起上游 HTTP 请求
    return new Promise((resolve) => {
      const urlObj = new URL(targetUrl)
      const bodyStr = JSON.stringify(nativeRequest)

      const options: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          ...forwardHeaders,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      }

      const protocol = urlObj.protocol === 'https:' ? https : http
      const upstreamReq = protocol.request(options, (upstreamRes: IncomingMessage) => {
        // 检查上游响应状态
        if (upstreamRes.statusCode && upstreamRes.statusCode >= 400) {
          const chunks: Buffer[] = []
          upstreamRes.on('data', (chunk: Buffer) => chunks.push(chunk))
          upstreamRes.on('end', () => {
            const errorBody = Buffer.concat(chunks).toString('utf-8')
            // 如果还没发送响应头，发送错误响应
            if (!res.headersSent) {
              res.writeHead(upstreamRes.statusCode ?? 502, { 'Content-Type': 'application/json' })
            }
            res.end(errorBody)
            this.recordLog(channel, body, req, upstreamRes.statusCode ?? 502, startTime)
            resolve()
          })
          return
        }

        // 5. 逐 chunk 转发 + 累积 buffer（用于提取末尾 usage 信息）
        let sseBuffer = ''
        upstreamRes.on('data', (chunk: Buffer) => {
          sseBuffer += chunk.toString('utf-8')
          res.write(chunk)
        })

        upstreamRes.on('end', () => {
          res.end()
          const usage = this.extractUsageFromSSE(sseBuffer)
          this.recordLog(channel, body, req, 200, startTime, usage)
          resolve()
        })

        upstreamRes.on('error', (err: Error) => {
          console.error('上游 SSE 响应错误:', err.message)
          res.end()
          this.recordLog(channel, body, req, 502, startTime)
          resolve()
        })
      })

      upstreamReq.on('error', (err: Error) => {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' })
        }
        res.end(JSON.stringify({ error: { message: `SSE 转发失败: ${err.message}` } }))
        this.recordLog(channel, body, req, 502, startTime)
        resolve()
      })

      upstreamReq.write(bodyStr)
      upstreamReq.end()
    })
  }

  /** 记录请求日志 */
  private recordLog(
    channel: Channel,
    body: OpenAIChatRequest,
    req: IncomingMessage,
    statusCode: number,
    startTime: number,
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  ): void {
    if (!this.settingsStore.get().loggingEnabled) return
    const duration = Date.now() - startTime
    this.logStore.add({
      channelId: channel.id,
      channelName: channel.name,
      model: body.model ?? 'unknown',
      method: req.method ?? 'POST',
      path: req.url ?? '/',
      statusCode,
      duration,
      usage,
    })
  }

  /** 从 SSE 累积数据中提取 token usage
   *
   * SSE 格式示例（OpenAI）：
   *   data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}
   *
   * 遍历所有 "data:" 行，从最后一条包含 "usage" 的 JSON 中提取。
   */
  private extractUsageFromSSE(buffer: string): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
    const lines = buffer.split('\n')
    // 从后往前找第一个包含 usage 的 data 行
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      if (!line.startsWith('data:')) continue
      const jsonStr = line.slice(5).trim()
      if (jsonStr === '[DONE]') continue
      try {
        const parsed = JSON.parse(jsonStr)
        if (parsed.usage?.total_tokens != null) {
          return {
            promptTokens: parsed.usage.prompt_tokens ?? 0,
            completionTokens: parsed.usage.completion_tokens ?? 0,
            totalTokens: parsed.usage.total_tokens,
          }
        }
      } catch {
        // 非 JSON 行（如注释），跳过
      }
    }
    return undefined
  }
}
