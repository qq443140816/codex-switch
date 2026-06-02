import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { app } from 'electron'
import { ClientType, AppError, ErrorCode } from '../../shared/types'
import type { ClientConfig, ConfigBackup } from '../../shared/types'
import type { IClientAdapter } from './base'
import { BackupStore } from '../store/backup-store'

/** OpenClaw 客户端适配器 — 处理 config.json */
export class OpenClawAdapter implements IClientAdapter {
  readonly clientType = ClientType.OPENCLAW

  private readonly configJsonPath: string
  private readonly backupStore: BackupStore

  constructor() {
    // %APPDATA%/openclaw/config.json
    this.configJsonPath = join(app.getPath('appData'), 'openclaw', 'config.json')
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
        throw new AppError(ErrorCode.CLIENT_NOT_DETECTED, 'OpenClaw 配置文件不存在')
      }

      const content = readFileSync(this.configJsonPath, 'utf-8')
      const parsed = JSON.parse(content) as Record<string, unknown>
      const provider = parsed.provider as Record<string, unknown> ?? {}

      return {
        apiBaseUrl: (provider.endpoint as string) ?? '',
        apiKey: (provider.apiKey as string) ?? '',
        model: (provider.model as string) ?? '',
        extra: parsed,
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.CLIENT_CONFIG_READ_FAILED, `读取 OpenClaw 配置失败: ${(err as Error).message}`)
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

      // 更新 provider 字段
      const provider = (currentData.provider as Record<string, unknown>) ?? {}
      if (config.apiBaseUrl) provider.endpoint = config.apiBaseUrl
      if (config.apiKey) provider.apiKey = config.apiKey
      if (config.model) provider.model = config.model
      currentData.provider = provider

      writeFileSync(this.configJsonPath, JSON.stringify(currentData, null, 2), 'utf-8')
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `写入 OpenClaw 配置失败: ${(err as Error).message}`)
    }
  }

  backupConfig(): ConfigBackup {
    if (!existsSync(this.configJsonPath)) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, 'OpenClaw 配置文件不存在')
    }
    const content = readFileSync(this.configJsonPath, 'utf-8')
    return this.backupStore.create(ClientType.OPENCLAW, content, this.configJsonPath)
  }

  restoreConfig(backupId: string): void {
    this.backupStore.restore(backupId)
  }

  listBackups(): ConfigBackup[] {
    return this.backupStore.list(ClientType.OPENCLAW)
  }
}
