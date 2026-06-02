import { ServiceType } from '../../shared/types'
import type { OpenAIChatRequest, OpenAIChatResponse } from '../../shared/types'
import type { IProtocolConverter } from './base'

/** 智谱协议转换器 — OpenAI 兼容格式，含模型名映射 */
export class ZhipuConverter implements IProtocolConverter {
  readonly serviceType = ServiceType.ZHIPU
  readonly supportsStreamingConversion = false

  convertRequest(req: OpenAIChatRequest): OpenAIChatRequest {
    // 智谱使用 OpenAI 兼容格式，仅做模型名映射
    return {
      ...req,
      model: this.mapModelName(req.model),
    }
  }

  convertResponse(res: unknown): OpenAIChatResponse {
    // 智谱响应格式与 OpenAI 相同
    return res as OpenAIChatResponse
  }

  /** 模型名称映射 */
  private mapModelName(model: string): string {
    const modelMap: Record<string, string> = {
      'glm-4-plus': 'glm-4-plus',
      'glm-4-flash': 'glm-4-flash',
      'glm-4': 'glm-4',
    }
    return modelMap[model] ?? model
  }
}
