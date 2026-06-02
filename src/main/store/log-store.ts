import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'
import { RequestLog, LogFilters, LogStats, AppError, ErrorCode } from '../../shared/types'

/** 日志最大保留条数 */
const MAX_LOG_COUNT = 10000

/** 请求日志存储 */
export class LogStore {
  private readonly store: Store<{ logs: RequestLog[] }>

  constructor() {
    this.store = new Store<{ logs: RequestLog[] }>({
      name: 'logs',
      defaults: {
        logs: [],
      },
    })
  }

  /** 添加一条请求日志 */
  add(log: Omit<RequestLog, 'id'>): RequestLog {
    try {
      const logs = this.store.get('logs', [])

      const newLog: RequestLog = {
        id: uuidv4(),
        ...log,
      }

      logs.unshift(newLog)

      // 超过最大保留条数时移除最旧的记录
      if (logs.length > MAX_LOG_COUNT) {
        logs.splice(MAX_LOG_COUNT)
      }

      this.store.set('logs', logs)
      return newLog
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `写入日志失败: ${(err as Error).message}`)
    }
  }

  /** 查询日志列表（支持筛选） */
  list(filters: LogFilters = {}): RequestLog[] {
    try {
      let logs = this.store.get('logs', [])

      // 按渠道筛选
      if (filters.channelId) {
        logs = logs.filter((log) => log.channelId === filters.channelId)
      }

      // 按状态码筛选
      if (filters.statusCode) {
        logs = logs.filter((log) => log.statusCode === filters.statusCode)
      }

      // 按开始日期筛选
      if (filters.startDate) {
        const start = new Date(filters.startDate).getTime()
        logs = logs.filter((log) => new Date(log.timestamp).getTime() >= start)
      }

      // 按结束日期筛选
      if (filters.endDate) {
        const end = new Date(filters.endDate).getTime()
        logs = logs.filter((log) => new Date(log.timestamp).getTime() <= end)
      }

      // 分页
      const offset = filters.offset ?? 0
      const limit = filters.limit ?? logs.length
      logs = logs.slice(offset, offset + limit)

      return logs
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `查询日志失败: ${(err as Error).message}`)
    }
  }

  /** 清空所有日志 */
  clear(): void {
    try {
      this.store.set('logs', [])
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `清空日志失败: ${(err as Error).message}`)
    }
  }

  /** 获取日志统计信息 */
  getStats(): LogStats {
    try {
      const logs = this.store.get('logs', [])

      const totalRequests = logs.length
      const successCount = logs.filter((log) => log.statusCode >= 200 && log.statusCode < 300).length
      const errorCount = totalRequests - successCount
      const avgDuration = totalRequests > 0
        ? Math.round(logs.reduce((sum, log) => sum + log.duration, 0) / totalRequests)
        : 0

      return {
        totalRequests,
        successCount,
        errorCount,
        avgDuration,
      }
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `获取日志统计失败: ${(err as Error).message}`)
    }
  }
}
