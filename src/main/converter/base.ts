import { ServiceType } from '../../shared/types'
import type { OpenAIChatRequest, OpenAIChatResponse } from '../../shared/types'

/** 协议转换器接口 */
export interface IProtocolConverter {
  /** 该转换器对应的服务类型 */
  readonly serviceType: ServiceType

  /** 是否支持流式 chunk 转换（MVP 仅 OpenAI 兼容格式直通，设为 false） */
  readonly supportsStreamingConversion: boolean

  /**
   * 将 OpenAI Chat 格式请求转换为目标 API 原生格式
   * @param req OpenAI Chat 请求
   * @returns 目标 API 格式的请求体
   */
  convertRequest(req: OpenAIChatRequest): unknown

  /**
   * 将目标 API 原生响应转换为 OpenAI Chat 格式
   * @param res 目标 API 的响应体
   * @returns OpenAI Chat 格式的响应
   */
  convertResponse(res: unknown): OpenAIChatResponse
}
