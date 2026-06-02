import { ServiceType } from '../../shared/types'
import type { OpenAIChatRequest, OpenAIChatResponse } from '../../shared/types'
import type { IProtocolConverter } from './base'

/** 通义千问协议转换器 — OpenAI 兼容格式，含模型名映射 */
export class QwenConverter implements IProtocolConverter {
  readonly serviceType = ServiceType.QWEN
  readonly supportsStreamingConversion = false

  convertRequest(req: OpenAIChatRequest): OpenAIChatRequest {
    // 通义千问使用 OpenAI 兼容格式，仅做模型名映射
    return {
      ...req,
      model: this.mapModelName(req.model),
    }
  }

  convertResponse(res: unknown): OpenAIChatResponse {
    // 通义千问响应格式与 OpenAI 相同
    return res as OpenAIChatResponse
  }

  /** 模型名称映射 */
  private mapModelName(model: string): string {
    const modelMap: Record<string, string> = {
      'qwen-turbo': 'qwen-turbo',
      'qwen-plus': 'qwen-plus',
      'qwen-max': 'qwen-max',
      'qwq-32b': 'qwq-32b',
    }
    return modelMap[model] ?? model
  }
}
