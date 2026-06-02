import { ServiceType } from '../../shared/types'
import type {
  OpenAIChatRequest,
  OpenAIChatResponse,
  ClaudeMessagesRequest,
  ClaudeMessagesResponse,
} from '../../shared/types'
import type { IProtocolConverter } from './base'
import { v4 as uuidv4 } from 'uuid'

/** Claude Messages API 协议转换器 */
export class ClaudeConverter implements IProtocolConverter {
  readonly serviceType = ServiceType.CLAUDE
  readonly supportsStreamingConversion = false

  convertRequest(req: OpenAIChatRequest): ClaudeMessagesRequest {
    // 分离 system 消息和普通消息
    let systemPrompt: string | undefined
    const messages: ClaudeMessagesRequest['messages'] = []

    for (const msg of req.messages) {
      if (msg.role === 'system') {
        // Claude 将 system 作为顶层字段
        systemPrompt = msg.content
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    const result: ClaudeMessagesRequest = {
      model: this.mapModelName(req.model),
      max_tokens: req.max_tokens ?? 4096,
      messages,
    }

    if (systemPrompt) {
      result.system = systemPrompt
    }

    if (req.temperature !== undefined) {
      result.temperature = req.temperature
    }

    return result
  }

  convertResponse(res: unknown): OpenAIChatResponse {
    const claudeRes = res as ClaudeMessagesResponse

    // 提取文本内容
    const textContent = claudeRes.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('') ?? ''

    return {
      id: claudeRes.id ?? uuidv4(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: claudeRes.model ?? 'claude',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: textContent,
          },
          finish_reason: claudeRes.stop_reason === 'end_turn' ? 'stop' : (claudeRes.stop_reason ?? 'stop'),
        },
      ],
      usage: claudeRes.usage
        ? {
            prompt_tokens: claudeRes.usage.input_tokens,
            completion_tokens: claudeRes.usage.output_tokens,
            total_tokens: claudeRes.usage.input_tokens + claudeRes.usage.output_tokens,
          }
        : undefined,
    }
  }

  /** 模型名称映射：OpenAI 格式 → Claude 原生格式 */
  private mapModelName(model: string): string {
    const modelMap: Record<string, string> = {
      'claude-sonnet-4-20250514': 'claude-sonnet-4-20250514',
      'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
      'claude-3-opus': 'claude-3-opus-20240229',
    }
    return modelMap[model] ?? model
  }
}
