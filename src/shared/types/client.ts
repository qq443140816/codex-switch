/** 客户端类型枚举 */
export enum ClientType {
  CODEX = 'codex',
  WORKBUDDY = 'workbuddy',
  QORDER = 'qorder',
  OPENCLAW = 'openclaw',
}

/** 客户端配置 */
export interface ClientConfig {
  apiBaseUrl: string
  apiKey: string
  model: string
  extra: Record<string, unknown>
}

/** 客户端信息 */
export interface ClientInfo {
  clientType: ClientType
  name: string
  /** 是否检测到已安装 */
  detected: boolean
  /** 配置文件路径列表 */
  configPaths: string[]
  /** 当前配置（检测到时才有值） */
  currentConfig: ClientConfig | null
  /** 已关联的渠道 ID */
  linkedChannelId: string | null
}

/** 配置备份 */
export interface ConfigBackup {
  id: string
  clientId: string
  filePath: string
  timestamp: string
  /** 备份文件大小（字节） */
  size: number
}
