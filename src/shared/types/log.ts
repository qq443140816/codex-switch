/** 请求日志 */
export interface RequestLog {
  id: string
  channelId: string
  channelName: string
  model: string
  method: string
  path: string
  statusCode: number
  /** 请求耗时（毫秒） */
  duration: number
  timestamp: string
  /** Token 用量（仅成功且服务端返回 usage 时有值） */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/** 日志筛选条件 */
export interface LogFilters {
  channelId?: string
  statusCode?: number
  startDate?: string
  endDate?: string
  /** 分页偏移 */
  offset?: number
  /** 分页大小 */
  limit?: number
}

/** 日志统计 */
export interface LogStats {
  totalRequests: number
  successCount: number
  errorCount: number
  avgDuration: number
}
