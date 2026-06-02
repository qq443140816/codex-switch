import { Channel, ServiceType, AppError, ErrorCode } from '../../shared/types'
import { ChannelStore } from '../store/channel-store'

/** 请求路由器 — 根据活跃渠道分发请求 */
export class RequestRouter {
  private readonly channelStore: ChannelStore

  constructor(channelStore: ChannelStore) {
    this.channelStore = channelStore
  }

  /**
   * 根据请求路径和请求体路由到对应渠道
   * MVP 仅支持单活跃渠道模式
   */
  route(path: string, body: unknown): Channel {
    // 查找活跃渠道
    const channels = this.channelStore.list()
    const activeChannel = channels.find((ch) => ch.isActive)

    if (!activeChannel) {
      throw new AppError(ErrorCode.PROXY_FORWARD_FAILED, '没有活跃渠道，请先在渠道管理中激活一个渠道')
    }

    return activeChannel
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
  resolveTargetUrl(channel: Channel, path: string, body?: unknown): string {
    const baseUrl = channel.baseUrl.replace(/\/+$/, '')

    // 不同服务商的 API 路径映射
    switch (channel.serviceType) {
      case ServiceType.OPENAI:
      case ServiceType.DEEPSEEK:
      case ServiceType.QWEN:
      case ServiceType.ZHIPU:
        // OpenAI 兼容格式，直接拼接路径
        // 包括 /v1/chat/completions 和 /v1/responses 等
        return `${baseUrl}${path}`

      case ServiceType.CLAUDE:
        // Claude Messages API 路径
        // 仅对 /v1/chat/completions 请求映射到 /v1/messages
        // /v1/responses 等其他路径不应被错误匹配
        return `${baseUrl}/v1/messages`

      case ServiceType.GEMINI: {
        // Gemini API 路径
        const model = (body as { model?: string })?.model ?? 'gemini-2.0-flash'
        return `${baseUrl}/v1beta/models/${model}:generateContent`
      }

      default:
        // 自定义渠道，直接拼接
        // 支持所有路径，包括 /v1/responses
        return `${baseUrl}${path}`
    }
  }
}
