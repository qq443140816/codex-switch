import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { ClientType, AppError, ErrorCode } from '../../shared/types'
import type { ClientConfig, ConfigBackup } from '../../shared/types'
import type { IClientAdapter } from './base'
import { BackupStore } from '../store/backup-store'

/** WorkBuddy 客户端适配器 — 处理 models.json
 *
 * 真实配置格式（WorkBuddy/CodeBuddy）：
 * - 路径：~/.workbuddy/models.json（NOT settings.json）
 * - 格式：JSON 数组，每个元素代表一个模型端点
 *   [{ "id": "gpt-5.2", "name": "gpt-5.2", "vendor": "Custom",
 *      "url": "http://localhost:3000/v1", "apiKey": "xxx", ... }]
 */
export class WorkBuddyAdapter implements IClientAdapter {
  readonly clientType = ClientType.WORKBUDDY

  private readonly modelsJsonPath: string
  private readonly backupStore: BackupStore

  constructor() {
    // ~/.workbuddy/models.json
    this.modelsJsonPath = join(homedir(), '.workbuddy', 'models.json')
    this.backupStore = new BackupStore()
  }

  getConfigPaths(): string[] {
    return [this.modelsJsonPath]
  }

  detect(): boolean {
    return existsSync(this.modelsJsonPath)
  }

  readConfig(): ClientConfig {
    try {
      if (!existsSync(this.modelsJsonPath)) {
        throw new AppError(ErrorCode.CLIENT_NOT_DETECTED, 'WorkBuddy 配置文件不存在')
      }

      const content = readFileSync(this.modelsJsonPath, 'utf-8')
      const models = JSON.parse(content) as Array<Record<string, unknown>>

      if (models.length === 0) {
        return { apiBaseUrl: '', apiKey: '', model: '', extra: { models: [] } }
      }

      // 取第一个模型端点作为活跃配置
      const activeModel = models[0]
      return {
        apiBaseUrl: (activeModel.url as string) ?? '',
        apiKey: (activeModel.apiKey as string) ?? '',
        model: (activeModel.id as string) ?? '',
        extra: { models },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.CLIENT_CONFIG_READ_FAILED, `读取 WorkBuddy 配置失败: ${(err as Error).message}`)
    }
  }

  writeConfig(config: ClientConfig): void {
    try {
      // 仅在文件存在时备份
      if (existsSync(this.modelsJsonPath)) {
        this.backupConfig()
      }

      // 读取现有 models.json
      let models: Array<Record<string, unknown>> = []
      if (existsSync(this.modelsJsonPath)) {
        const content = readFileSync(this.modelsJsonPath, 'utf-8')
        models = JSON.parse(content) as Array<Record<string, unknown>>
      }

      if (models.length === 0) {
        // 创建新的模型端点
        models.push({
          id: config.model,
          name: config.model,
          vendor: 'Custom',
          url: config.apiBaseUrl,
          apiKey: config.apiKey,
          supportsToolCall: true,
          supportsImages: true,
          supportsReasoning: true,
          useCustomProtocol: false,
          maxInputTokens: 262144,
          maxOutputTokens: 65536,
        })
      } else {
        // 更新第一个模型端点
        if (config.apiBaseUrl) models[0].url = config.apiBaseUrl
        if (config.apiKey) models[0].apiKey = config.apiKey
        if (config.model) {
          models[0].id = config.model
          models[0].name = config.model
        }
      }

      writeFileSync(this.modelsJsonPath, JSON.stringify(models, null, 2), 'utf-8')
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `写入 WorkBuddy 配置失败: ${(err as Error).message}`)
    }
  }

  backupConfig(): ConfigBackup {
    if (!existsSync(this.modelsJsonPath)) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, 'WorkBuddy 配置文件不存在')
    }
    const content = readFileSync(this.modelsJsonPath, 'utf-8')
    return this.backupStore.create(ClientType.WORKBUDDY, content, this.modelsJsonPath)
  }

  restoreConfig(backupId: string): void {
    this.backupStore.restore(backupId)
  }

  listBackups(): ConfigBackup[] {
    return this.backupStore.list(ClientType.WORKBUDDY)
  }
}
