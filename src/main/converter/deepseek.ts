import { ServiceType } from '../../shared/types'
import type { OpenAIChatRequest, OpenAIChatResponse } from '../../shared/types'
import type { IProtocolConverter } from './base'

/** DeepSeek 协议转换器 — OpenAI 兼容格式，含模型名映射 */
export class DeepSeekConverter implements IProtocolConverter {
  readonly serviceType = ServiceType.DEEPSEEK
  readonly supportsStreamingConversion = false

  convertRequest(req: OpenAIChatRequest): OpenAIChatRequest {
    // DeepSeek 使用 OpenAI 兼容格式，仅做模型名映射
    return {
      ...req,
      model: this.mapModelName(req.model),
    }
  }

  convertResponse(res: unknown): OpenAIChatResponse {
    // DeepSeek 响应格式与 OpenAI 相同
    return res as OpenAIChatResponse
  }

  /** 模型名称映射 */
  private mapModelName(model: string): string {
    const modelMap: Record<string, string> = {
      'deepseek-chat': 'deepseek-chat',
      'deepseek-reasoner': 'deepseek-reasoner',
      'gpt-4': 'deepseek-chat',
      'gpt-4o': 'deepseek-chat',
    }
    return modelMap[model] ?? model
  }
}
