import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { ClientType, AppError, ErrorCode } from '../../shared/types'
import type { ClientConfig, ConfigBackup } from '../../shared/types'
import type { IClientAdapter } from './base'
import { BackupStore } from '../store/backup-store'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

/** Codex 客户端适配器 — 处理 config.toml + auth.json */
export class CodexAdapter implements IClientAdapter {
  readonly clientType = ClientType.CODEX

  private readonly configTomlPath: string
  private readonly authJsonPath: string
  private readonly backupStore: BackupStore

  constructor() {
    const codexDir = join(homedir(), '.codex')
    this.configTomlPath = join(codexDir, 'config.toml')
    this.authJsonPath = join(codexDir, 'auth.json')
    this.backupStore = new BackupStore()
  }

  getConfigPaths(): string[] {
    return [this.configTomlPath, this.authJsonPath]
  }

  detect(): boolean {
    return existsSync(this.configTomlPath) || existsSync(this.authJsonPath)
  }

  readConfig(): ClientConfig {
    try {
      let apiBaseUrl = ''
      let apiKey = ''
      let model = ''
      const extra: Record<string, unknown> = {}

      // 读取 config.toml
      if (existsSync(this.configTomlPath)) {
        const tomlContent = readFileSync(this.configTomlPath, 'utf-8')
        const parsed = parseToml(tomlContent) as Record<string, any>

        // 从 model_providers 段获取 base_url
        const providers = (parsed.model_providers as Record<string, any>) ?? {}
        const activeProviderId = (parsed.model_provider as string) ?? 'custom'
        const activeProvider = (providers[activeProviderId] as Record<string, any>) ?? {}
        apiBaseUrl = (activeProvider.base_url as string) ?? ''

        // 模型名
        model = (parsed.model as string) ?? ''

        Object.assign(extra, { tomlData: parsed, activeProviderId })
      }

      // 读取 auth.json — 使用 OPENAI_API_KEY 字段
      if (existsSync(this.authJsonPath)) {
        const authContent = readFileSync(this.authJsonPath, 'utf-8')
        const authParsed = JSON.parse(authContent) as Record<string, unknown>
        apiKey = (authParsed.OPENAI_API_KEY as string) ?? ''
        Object.assign(extra, { authData: authParsed })
      }

      return { apiBaseUrl, apiKey, model, extra }
    } catch (err) {
      throw new AppError(ErrorCode.CLIENT_CONFIG_READ_FAILED, `读取 Codex 配置失败: ${(err as Error).message}`)
    }
  }

  writeConfig(config: ClientConfig): void {
    try {
      // 仅在至少一个配置文件存在时备份
      const hasExistingConfig = this.getConfigPaths().some((p) => existsSync(p))
      if (hasExistingConfig) {
        this.backupConfig()
      }

      // 1. 读取现有 config.toml（保留所有现有段）
      let tomlData: Record<string, any> = {}
      if (existsSync(this.configTomlPath)) {
        const tomlContent = readFileSync(this.configTomlPath, 'utf-8')
        tomlData = parseToml(tomlContent) as Record<string, any>
      }

      // 2. 修改目标字段
      if (config.model) {
        tomlData.model = config.model
      }

      // 3. 设置 model_provider = "custom"
      tomlData.model_provider = 'custom'

      // 4. 确保 [model_providers.custom] 段存在
      if (!tomlData.model_providers) {
        tomlData.model_providers = {}
      }
      if (!(tomlData.model_providers as Record<string, any>).custom) {
        ;(tomlData.model_providers as Record<string, any>).custom = {}
      }

      if (config.apiBaseUrl) {
        ;(tomlData.model_providers as Record<string, any>).custom.base_url = config.apiBaseUrl
      }
      ;(tomlData.model_providers as Record<string, any>).custom.name = 'custom'
      ;(tomlData.model_providers as Record<string, any>).custom.wire_api = 'responses'
      ;(tomlData.model_providers as Record<string, any>).custom.requires_openai_auth = true

      // 5. 整体写回
      writeFileSync(this.configTomlPath, stringifyToml(tomlData as any), 'utf-8')

      // 6. 写入 auth.json（保留现有字段）
      let authData: Record<string, any> = {}
      if (existsSync(this.authJsonPath)) {
        const authContent = readFileSync(this.authJsonPath, 'utf-8')
        authData = JSON.parse(authContent) as Record<string, any>
      }
      if (config.apiKey) {
        authData.OPENAI_API_KEY = config.apiKey
        authData.auth_mode = 'apikey'
      }
      writeFileSync(this.authJsonPath, JSON.stringify(authData, null, 2), 'utf-8')
    } catch (err) {
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `写入 Codex 配置失败: ${(err as Error).message}`)
    }
  }

  backupConfig(): ConfigBackup {
    const configPaths = this.getConfigPaths()
    const lastBackup = configPaths
      .filter((p) => existsSync(p))
      .map((p) => {
        const content = readFileSync(p, 'utf-8')
        return this.backupStore.create(ClientType.CODEX, content, p)
      })
      .pop()

    if (!lastBackup) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, '没有可备份的 Codex 配置文件')
    }
    return lastBackup
  }

  restoreConfig(backupId: string): void {
    this.backupStore.restore(backupId)
  }

  listBackups(): ConfigBackup[] {
    return this.backupStore.list(ClientType.CODEX)
  }
}
