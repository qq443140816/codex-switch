import { ClientType } from '../../shared/types'
import type { ClientConfig, ConfigBackup } from '../../shared/types'

/** 客户端适配器接口 */
export interface IClientAdapter {
  /** 该适配器对应的客户端类型 */
  readonly clientType: ClientType

  /** 检测客户端是否已安装 */
  detect(): boolean

  /** 获取配置文件路径列表 */
  getConfigPaths(): string[]

  /** 读取客户端当前配置 */
  readConfig(): ClientConfig

  /** 写入客户端配置 */
  writeConfig(config: ClientConfig): void

  /** 备份当前配置 */
  backupConfig(): ConfigBackup

  /** 恢复指定备份 */
  restoreConfig(backupId: string): void

  /** 列出所有备份 */
  listBackups(): ConfigBackup[]
}
