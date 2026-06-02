/** 代理服务状态枚举 */
export enum ProxyStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/** 代理状态信息 */
export interface ProxyStatusInfo {
  status: ProxyStatus
  port: number
  /** 当前活跃渠道 ID */
  activeChannelId: string | null
  /** 活跃渠道名称 */
  activeChannelName: string | null
  /** 错误信息（status=error 时） */
  errorMessage: string | null
}

/** OpenAI Chat 请求格式 */
export interface OpenAIChatRequest {
  model: string
  messages: OpenAIChatMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
  stop?: string[]
  [key: string]: unknown
}

/** OpenAI Chat 消息 */
export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
  [key: string]: unknown
}

/** OpenAI Chat 响应格式 */
export interface OpenAIChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: OpenAIChatChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/** OpenAI Chat 选择项 */
export interface OpenAIChatChoice {
  index: number
  message: OpenAIChatMessage
  finish_reason: string
}

/** Claude Messages API 请求格式 */
export interface ClaudeMessagesRequest {
  model: string
  max_tokens: number
  messages: ClaudeMessage[]
  system?: string
  temperature?: number
  [key: string]: unknown
}

/** Claude 消息 */
export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Claude Messages API 响应格式 */
export interface ClaudeMessagesResponse {
  id: string
  type: string
  role: string
  content: ClaudeContentBlock[]
  model: string
  stop_reason: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/** Claude 内容块 */
export interface ClaudeContentBlock {
  type: 'text'
  text: string
}

/** Gemini generateContent 请求格式 */
export interface GeminiGenerateRequest {
  contents: GeminiContent[]
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
    topP?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

/** Gemini 内容 */
export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

/** Gemini 部分 */
export interface GeminiPart {
  text?: string
  [key: string]: unknown
}

/** Gemini generateContent 响应格式 */
export interface GeminiGenerateResponse {
  candidates: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

/** Gemini 候选 */
export interface GeminiCandidate {
  content: GeminiContent
  finishReason: string
}

/** Responses API 请求格式 */
export interface OpenAIResponsesRequest {
  model: string
  input: string | ResponseInputItem[]
  instructions?: string
  stream?: boolean
  temperature?: number
  max_output_tokens?: number
  [key: string]: unknown
}

/** Responses API 输入项 */
export interface ResponseInputItem {
  role: 'user' | 'assistant' | 'system'
  content: string | ResponseContentPart[]
}

/** Responses API 内容部分 */
export interface ResponseContentPart {
  type: 'input_text' | 'output_text'
  text: string
}
