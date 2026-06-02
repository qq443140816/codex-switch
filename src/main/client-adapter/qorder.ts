import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { ClientType, AppError, ErrorCode } from '../../shared/types'
import type { ClientConfig, ConfigBackup } from '../../shared/types'
import type { IClientAdapter } from './base'
import { BackupStore } from '../store/backup-store'

/** Qorder 客户端适配器 — 处理 config.json */
export class QorderAdapter implements IClientAdapter {
  readonly clientType = ClientType.QORDER

  private readonly configJsonPath: string
  private readonly backupStore: BackupStore

  constructor() {
    // ~/.qorder/config.json
    this.configJsonPath = join(homedir(), '.qorder', 'config.json')
    this.backupStore = new BackupStore()
  }

  getConfigPaths(): string[] {
    return [this.configJsonPath]
  }

  detect(): boolean {
    return existsSync(this.configJsonPath)
  }

  readConfig(): ClientConfig {
    try {
      if (!existsSync(this.configJsonPath)) {
        throw new AppError(ErrorCode.CLIENT_NOT_DETECTED, 'Qorder 配置文件不存在')
      }

      const content = readFileSync(this.configJsonPath, 'utf-8')
      const parsed = JSON.parse(content) as Record<string, unknown>
      const openai = parsed.openai as Record<string, unknown> ?? {}

      return {
        apiBaseUrl: (openai.baseURL as string) ?? '',
        apiKey: (openai.apiKey as string) ?? '',
        model: (openai.model as string) ?? '',
        extra: parsed,
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.CLIENT_CONFIG_READ_FAILED, `读取 Qorder 配置失败: ${(err as Error).message}`)
    }
  }

  writeConfig(config: ClientConfig): void {
    try {
      this.backupConfig()

      let currentData: Record<string, unknown> = {}
      if (existsSync(this.configJsonPath)) {
        const content = readFileSync(this.configJsonPath, 'utf-8')
        currentData = JSON.parse(content)
      }

      // 更新 openai 字段
      const openai = (currentData.openai as Record<string, unknown>) ?? {}
      if (config.apiBaseUrl) openai.baseURL = config.apiBaseUrl
      if (config.apiKey) openai.apiKey = config.apiKey
      if (config.model) openai.model = config.model
      currentData.openai = openai

      writeFileSync(this.configJsonPath, JSON.stringify(currentData, null, 2), 'utf-8')
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `写入 Qorder 配置失败: ${(err as Error).message}`)
    }
  }

  backupConfig(): ConfigBackup {
    if (!existsSync(this.configJsonPath)) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, 'Qorder 配置文件不存在')
    }
    const content = readFileSync(this.configJsonPath, 'utf-8')
    return this.backupStore.create(ClientType.QORDER, content, this.configJsonPath)
  }

  restoreConfig(backupId: string): void {
    this.backupStore.restore(backupId)
  }

  listBackups(): ConfigBackup[] {
    return this.backupStore.list(ClientType.QORDER)
  }
}
