import dayjs from 'dayjs'

/**
 * 格式化日期时间
 * @param isoString ISO 8601 格式的时间字符串
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '-'
  return dayjs(isoString).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化文件大小
 * @param bytes 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)
  return `${size.toFixed(1)} ${units[i]}`
}

/**
 * 格式化耗时
 * @param ms 毫秒数
 * @returns 格式化后的耗时字符串
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * 脱敏 API Key
 * @param apiKey API Key 原文
 * @returns 脱敏后的 API Key
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 8) return '****'
  const prefix = apiKey.substring(0, 4)
  const suffix = apiKey.substring(apiKey.length - 4)
  return `${prefix}****${suffix}`
}
