/** 统一错误码枚举 */
export enum ErrorCode {
  // 代理引擎 (1xxx)
  PROXY_START_FAILED = 1001,
  PROXY_PORT_IN_USE = 1002,
  PROXY_FORWARD_FAILED = 1003,
  PROXY_CONVERT_FAILED = 1004,

  // 渠道管理 (2xxx)
  CHANNEL_NOT_FOUND = 2001,
  CHANNEL_TEST_FAILED = 2002,

  // 客户端适配 (3xxx)
  CLIENT_NOT_DETECTED = 3001,
  CLIENT_CONFIG_READ_FAILED = 3002,
  CLIENT_CONFIG_WRITE_FAILED = 3003,
  CLIENT_BACKUP_FAILED = 3004,

  // 加密 (4xxx)
  ENCRYPTION_FAILED = 4001,
  DECRYPTION_FAILED = 4002,

  // 存储 (5xxx)
  STORE_READ_FAILED = 5001,
  STORE_WRITE_FAILED = 5002,
}

/** 统一应用错误类型 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly details?: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }

  /** 序列化为 IPC 传输格式 */
  toJSON(): { code: ErrorCode; message: string; details?: unknown } {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }

  /** 从 IPC 传输格式反序列化 */
  static fromJSON(json: { code: ErrorCode; message: string; details?: unknown }): AppError {
    return new AppError(json.code, json.message, json.details)
  }
}

// 导出所有子模块类型
export * from './channel'
export * from './client'
export * from './proxy'
export * from './log'
export * from './settings'
export * from './ipc'
