import { ipcMain } from 'electron'
import type { IpcDeps } from './index'
import { ClientType, AppError, ErrorCode, getDefaultProxyBaseUrl } from '../../shared/types'

/** 注册客户端配置相关 IPC 处理器 */
export function registerClientHandlers(deps: IpcDeps): void {
  const { clientAdapterRegistry, channelStore, keyVault, backupStore, getMainWindow } = deps

  /** 获取客户端列表 */
  ipcMain.handle('client:list', async () => {
    return clientAdapterRegistry.detectAll()
  })

  /** 切换客户端到指定渠道 */
  ipcMain.handle('client:switch-channel', async (_event, args: { clientType: string; channelId: string }) => {
    try {
      const clientType = args.clientType as ClientType
      const adapter = clientAdapterRegistry.get(clientType)

      // 获取目标渠道信息
      const channel = channelStore.get(args.channelId)
      if (!channel) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${args.channelId} 不存在`)
      }

      // 解密 API Key
      const apiKey = keyVault.decrypt(channel.apiKeyEncrypted)

      // 读取当前配置并备份
      const currentConfig = adapter.readConfig()
      adapter.backupConfig()

      // 写入新配置：proxyBaseUrl 为空则走本机代理，非空则直连
      const settingsStore = deps.settingsStore
      const settings = settingsStore.get()
      const proxyUrl = channel.proxyBaseUrl ?? getDefaultProxyBaseUrl(settings.proxyPort)

      adapter.writeConfig({
        apiBaseUrl: proxyUrl,
        apiKey,
        model: channel.models[0] ?? '',
        extra: currentConfig.extra,
      })

      // 激活该渠道（ChannelStore 中标记 isActive，Router 路由时查找此标记）
      channelStore.setActiveChannel(args.channelId)

      // 推送配置变更事件
      const win = getMainWindow()
      if (win) {
        win.webContents.send('client:config-changed', { clientType: args.clientType })
      }

      return { success: true, backupId: '' }
    } catch (err) {
      if (err instanceof AppError) {
        return { success: false, error: err.toJSON() }
      }
      return { success: false, error: { code: ErrorCode.CLIENT_CONFIG_WRITE_FAILED, message: (err as Error).message } }
    }
  })

  /** 恢复客户端配置备份 */
  ipcMain.handle('client:restore', async (_event, args: { clientType: string; backupId: string }) => {
    try {
      const adapter = clientAdapterRegistry.get(args.clientType as ClientType)
      adapter.restoreConfig(args.backupId)

      const win = getMainWindow()
      if (win) {
        win.webContents.send('client:config-changed', { clientType: args.clientType })
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: { code: ErrorCode.CLIENT_BACKUP_FAILED, message: (err as Error).message } }
    }
  })

  /** 获取客户端备份列表 */
  ipcMain.handle('client:backups', async (_event, args: { clientType: string }) => {
    try {
      const adapter = clientAdapterRegistry.get(args.clientType as ClientType)
      return adapter.listBackups()
    } catch (err) {
      return []
    }
  })
}
