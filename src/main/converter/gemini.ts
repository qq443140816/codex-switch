import { ServiceType } from '../../shared/types'
import type {
  OpenAIChatRequest,
  OpenAIChatResponse,
  GeminiGenerateRequest,
  GeminiGenerateResponse,
  GeminiContent,
  GeminiPart,
} from '../../shared/types'
import type { IProtocolConverter } from './base'
import { v4 as uuidv4 } from 'uuid'

/** Gemini generateContent API 协议转换器 */
export class GeminiConverter implements IProtocolConverter {
  readonly serviceType = ServiceType.GEMINI
  readonly supportsStreamingConversion = false

  convertRequest(req: OpenAIChatRequest): GeminiGenerateRequest {
    const contents: GeminiContent[] = []

    for (const msg of req.messages) {
      const parts: GeminiPart[] = [{ text: msg.content }]

      if (msg.role === 'user') {
        contents.push({ role: 'user', parts })
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts })
      } else if (msg.role === 'system') {
        // Gemini 没有 system 角色，将 system 消息作为 user 消息前置
        contents.push({
          role: 'user',
          parts: [{ text: `[System Instruction] ${msg.content}` }],
        })
      }
    }

    const result: GeminiGenerateRequest = {
      contents,
    }

    if (req.temperature !== undefined || req.max_tokens !== undefined || req.top_p !== undefined) {
      result.generationConfig = {}
      if (req.temperature !== undefined) {
        result.generationConfig.temperature = req.temperature
      }
      if (req.max_tokens !== undefined) {
        result.generationConfig.maxOutputTokens = req.max_tokens
      }
      if (req.top_p !== undefined) {
        result.generationConfig.topP = req.top_p
      }
    }

    return result
  }

  convertResponse(res: unknown): OpenAIChatResponse {
    const geminiRes = res as GeminiGenerateResponse

    // 提取文本内容
    const textContent = geminiRes.candidates?.[0]?.content?.parts
      ?.filter((part) => part.text !== undefined)
      .map((part) => part.text!)
      .join('') ?? ''

    // 提取 finish reason
    const finishReason = geminiRes.candidates?.[0]?.finishReason ?? 'stop'
    const mappedFinishReason = finishReason === 'STOP' ? 'stop' : finishReason.toLowerCase()

    return {
      id: uuidv4(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gemini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: textContent,
          },
          finish_reason: mappedFinishReason,
        },
      ],
      usage: geminiRes.usageMetadata
        ? {
            prompt_tokens: geminiRes.usageMetadata.promptTokenCount ?? 0,
            completion_tokens: geminiRes.usageMetadata.candidatesTokenCount ?? 0,
            total_tokens: geminiRes.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    }
  }
}
