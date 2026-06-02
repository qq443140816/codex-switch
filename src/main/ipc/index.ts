import { ipcMain } from 'electron'
import type { ProxyServer } from '../proxy/server'
import type { ChannelStore } from '../store/channel-store'
import type { LogStore } from '../store/log-store'
import type { SettingsStore } from '../store/settings-store'
import type { BackupStore } from '../store/backup-store'
import type { KeyVault } from '../crypto/key-vault'
import type { ConverterRegistry } from '../converter/registry'
import type { ClientAdapterRegistry } from '../client-adapter/registry'
import type { TrayManager } from '../tray/tray-manager'
import type { BrowserWindow } from 'electron'
import { registerProxyHandlers } from './proxy-handlers'
import { registerChannelHandlers } from './channel-handlers'
import { registerClientHandlers } from './client-handlers'
import { registerLogHandlers } from './log-handlers'
import { registerSettingsHandlers } from './settings-handlers'

/** IPC 处理器依赖容器 */
export interface IpcDeps {
  proxyServer: ProxyServer
  channelStore: ChannelStore
  logStore: LogStore
  settingsStore: SettingsStore
  backupStore: BackupStore
  keyVault: KeyVault
  converterRegistry: ConverterRegistry
  clientAdapterRegistry: ClientAdapterRegistry
  trayManager: TrayManager | null
  getMainWindow: () => BrowserWindow | null
}

/** 统一注册所有 IPC 处理器 */
export function registerIpcHandlers(deps: IpcDeps): void {
  // 清除所有已有的 handler（避免重复注册）
  ipcMain.removeHandler('proxy:start')
  ipcMain.removeHandler('proxy:stop')
  ipcMain.removeHandler('proxy:status')
  ipcMain.removeHandler('proxy:set-channel')
  ipcMain.removeHandler('channel:list')
  ipcMain.removeHandler('channel:get')
  ipcMain.removeHandler('channel:create')
  ipcMain.removeHandler('channel:update')
  ipcMain.removeHandler('channel:delete')
  ipcMain.removeHandler('channel:test')
  ipcMain.removeHandler('client:list')
  ipcMain.removeHandler('client:switch-channel')
  ipcMain.removeHandler('client:restore')
  ipcMain.removeHandler('client:backups')
  ipcMain.removeHandler('log:list')
  ipcMain.removeHandler('log:clear')
  ipcMain.removeHandler('settings:get')
  ipcMain.removeHandler('settings:update')

  // 注册各域处理器
  registerProxyHandlers(deps)
  registerChannelHandlers(deps)
  registerClientHandlers(deps)
  registerLogHandlers(deps)
  registerSettingsHandlers(deps)

  console.log('IPC 处理器注册完成')
}
