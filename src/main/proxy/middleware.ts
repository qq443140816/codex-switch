import { IncomingMessage, ServerResponse } from 'http'
import { AppError } from '../../shared/types'

/** 请求日志中间件 — 记录请求基本信息 */
export function loggingMiddleware(req: IncomingMessage): void {
  const timestamp = new Date().toISOString()
  const method = req.method ?? 'UNKNOWN'
  const url = req.url ?? '/'
  console.log(`[${timestamp}] ${method} ${url}`)
}

/** 错误处理中间件 — 统一错误响应格式 */
export function errorMiddleware(
  err: Error,
  req: IncomingMessage,
  res: ServerResponse
): void {
  console.error(`代理请求错误 [${req.url}]:`, err.message)

  const statusCode = err instanceof AppError ? 502 : 500
  const errorResponse = {
    error: {
      message: err.message,
      code: err instanceof AppError ? err.code : 500,
    },
  }

  if (!res.headersSent) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  }
  res.end(JSON.stringify(errorResponse))
}
