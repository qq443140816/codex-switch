import { ClientType, AppError, ErrorCode, getDefaultProxyBaseUrl } from '../../shared/types'
import type { IClientAdapter } from './base'
import type { ClientInfo } from '../../shared/types'
import type { ChannelStore } from '../store/channel-store'
import type { SettingsStore } from '../store/settings-store'

/** 客户端适配器注册表 */
export class ClientAdapterRegistry {
  private readonly adapters: Map<ClientType, IClientAdapter> = new Map()
  private channelStore: ChannelStore | null = null
  private settingsStore: SettingsStore | null = null

  /** 注入 ChannelStore（用于匹配 linkedChannelId） */
  setChannelStore(store: ChannelStore): void {
    this.channelStore = store
  }

  /** 注入 SettingsStore（用于计算本机代理地址匹配） */
  setSettingsStore(store: SettingsStore): void {
    this.settingsStore = store
  }

  /** 注册一个客户端适配器 */
  register(adapter: IClientAdapter): void {
    this.adapters.set(adapter.clientType, adapter)
  }

  /** 获取指定类型的适配器 */
  get(clientType: ClientType): IClientAdapter {
    const adapter = this.adapters.get(clientType)
    if (!adapter) {
      throw new AppError(ErrorCode.CLIENT_NOT_DETECTED, `未找到 ${clientType} 类型的客户端适配器`)
    }
    return adapter
  }

  /** 检测所有已注册客户端的安装状态 */
  detectAll(): ClientInfo[] {
    const results: ClientInfo[] = []

    for (const [clientType, adapter] of this.adapters) {
      const detected = adapter.detect()
      const configPaths = adapter.getConfigPaths()
      let currentConfig = null

      if (detected) {
        try {
          currentConfig = adapter.readConfig()
        } catch {
          // 读取配置失败，仍标记为已检测
        }
      }

      const clientNames: Record<string, string> = {
        [ClientType.CODEX]: 'Codex CLI',
        [ClientType.WORKBUDDY]: 'WorkBuddy',
        [ClientType.QORDER]: 'Qorder',
        [ClientType.OPENCLAW]: 'OpenClaw',
      }

      // 匹配当前配置的 apiBaseUrl 到渠道，确定关联渠道
      let linkedChannelId: string | null = null
      if (detected && currentConfig && this.channelStore) {
        const channels = this.channelStore.list()
        const proxyPort = this.settingsStore?.get().proxyPort ?? 8080
        const localProxyUrl = getDefaultProxyBaseUrl(proxyPort)
        const matched = channels.find((ch) => {
          if (ch.proxyBaseUrl) {
            // 渠道配置了直连地址 → 精确匹配
            return ch.proxyBaseUrl === currentConfig.apiBaseUrl
          } else {
            // 渠道未配置代理地址 → 匹配本机代理地址
            return currentConfig.apiBaseUrl === localProxyUrl
          }
        })
        if (matched) {
          linkedChannelId = matched.id
        }
      }

      results.push({
        clientType,
        name: clientNames[clientType] ?? clientType,
        detected,
        configPaths,
        currentConfig,
        linkedChannelId,
      })
    }

    return results
  }

  /** 获取所有已注册的客户端类型 */
  getRegisteredTypes(): ClientType[] {
    return Array.from(this.adapters.keys())
  }
}
