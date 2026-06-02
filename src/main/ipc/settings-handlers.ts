import { ipcMain } from 'electron'
import type { IpcDeps } from './index'
import type { AppSettings } from '../../shared/types'

/** 注册设置管理相关 IPC 处理器 */
export function registerSettingsHandlers(deps: IpcDeps): void {
  const { settingsStore } = deps

  /** 获取应用设置 */
  ipcMain.handle('settings:get', async () => {
    return settingsStore.get()
  })

  /** 更新应用设置 */
  ipcMain.handle('settings:update', async (_event, partial: Partial<AppSettings>) => {
    return settingsStore.update(partial)
  })
}
