import { ServiceType } from '../../shared/types'
import type { OpenAIChatRequest, OpenAIChatResponse } from '../../shared/types'
import type { IProtocolConverter } from './base'

/** OpenAI 格式直通转换器 — 请求和响应均不转换 */
export class OpenAIConverter implements IProtocolConverter {
  readonly serviceType = ServiceType.OPENAI
  readonly supportsStreamingConversion = false

  convertRequest(req: OpenAIChatRequest): OpenAIChatRequest {
    // OpenAI 格式直通，无需转换
    return req
  }

  convertResponse(res: unknown): OpenAIChatResponse {
    // OpenAI 格式直通，直接返回
    return res as OpenAIChatResponse
  }
}
