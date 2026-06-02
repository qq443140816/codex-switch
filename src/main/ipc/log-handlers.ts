import { ipcMain } from 'electron'
import type { IpcDeps } from './index'
import type { LogFilters } from '../../shared/types'

/** 注册日志查询相关 IPC 处理器 */
export function registerLogHandlers(deps: IpcDeps): void {
  const { logStore } = deps

  /** 查询日志列表 */
  ipcMain.handle('log:list', async (_event, filters: LogFilters) => {
    return logStore.list(filters)
  })

  /** 清空日志 */
  ipcMain.handle('log:clear', async () => {
    logStore.clear()
    return { success: true }
  })
}
