/** 模型服务类型枚举 */
export enum ServiceType {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  QWEN = 'qwen',
  ZHIPU = 'zhipu',
  CUSTOM = 'custom',
}

/** 渠道数据模型 */
export interface Channel {
  id: string
  name: string
  serviceType: ServiceType
  /** 上游 API Base URL（如 https://api.openai.com） */
  baseUrl: string
  /** 代理 API 地址（写入客户端配置）。null=走本机代理转发，非空=直连该地址 */
  proxyBaseUrl: string | null
  /** 加密后的 API Key（Base64 编码） */
  apiKeyEncrypted: string
  /** 可用模型列表 */
  models: string[]
  /** 是否为当前活跃渠道 */
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 创建渠道 DTO */
export interface CreateChannelDTO {
  name: string
  serviceType: ServiceType
  baseUrl: string
  proxyBaseUrl?: string
  /** 明文 API Key（仅传输用，存储前加密） */
  apiKey: string
  models: string[]
}

/** 更新渠道 DTO */
export interface UpdateChannelDTO {
  name?: string
  serviceType?: ServiceType
  baseUrl?: string
  proxyBaseUrl?: string
  apiKey?: string
  models?: string[]
  isActive?: boolean
}

/** 渠道模板 */
export interface ChannelTemplate {
  serviceType: ServiceType
  name: string
  baseUrl: string
  defaultModels: string[]
}

/** 根据 ServiceType 生成默认代理地址 */
export function getDefaultProxyBaseUrl(port: number): string {
  return `http://127.0.0.1:${port}`
}

/** 根据 ServiceType 获取上游 API 参考地址（用于表单提示） */
export function getReferenceApiUrl(serviceType: ServiceType): string {
  const map: Record<ServiceType, string> = {
    [ServiceType.OPENAI]: 'https://api.openai.com',
    [ServiceType.CLAUDE]: 'https://api.anthropic.com',
    [ServiceType.DEEPSEEK]: 'https://api.deepseek.com',
    [ServiceType.GEMINI]: 'https://generativelanguage.googleapis.com',
    [ServiceType.QWEN]: 'https://dashscope.aliyuncs.com/compatible-mode',
    [ServiceType.ZHIPU]: 'https://open.bigmodel.cn/api/paas',
    [ServiceType.CUSTOM]: '',
  }
  return map[serviceType] ?? ''
}

/** 预置渠道模板 */
export const CHANNEL_TEMPLATES: ChannelTemplate[] = [
  {
    serviceType: ServiceType.OPENAI,
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
  },
  {
    serviceType: ServiceType.CLAUDE,
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModels: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
  },
  {
    serviceType: ServiceType.DEEPSEEK,
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    serviceType: ServiceType.GEMINI,
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModels: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'],
  },
  {
    serviceType: ServiceType.QWEN,
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    defaultModels: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwq-32b'],
  },
  {
    serviceType: ServiceType.ZHIPU,
    name: '智谱',
    baseUrl: 'https://open.bigmodel.cn/api/paas',
    defaultModels: ['glm-4-plus', 'glm-4-flash', 'glm-4'],
  },
]

/** 渠道连通性测试结果 */
export interface ChannelTestResult {
  success: boolean
  latency: number
  models: string[]
}
