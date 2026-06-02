import { ipcMain } from 'electron'
import type { IpcDeps } from './index'
import { AppError, ErrorCode } from '../../shared/types'

/** 注册代理服务相关 IPC 处理器 */
export function registerProxyHandlers(deps: IpcDeps): void {
  const { proxyServer, channelStore, trayManager, getMainWindow } = deps

  /** 启动代理服务 */
  ipcMain.handle('proxy:start', async (_event, args: { port: number }) => {
    try {
      await proxyServer.start(args.port)
      const status = proxyServer.getStatus()

      // 推送状态变更事件到渲染进程
      const win = getMainWindow()
      if (win) {
        win.webContents.send('proxy:status-changed', status)
      }

      // 同步托盘菜单状态
      trayManager?.updateStatus(status)

      return { success: true, port: args.port }
    } catch (err) {
      if (err instanceof AppError) {
        return { success: false, error: err.toJSON() }
      }
      return { success: false, error: { code: ErrorCode.PROXY_START_FAILED, message: (err as Error).message } }
    }
  })

  /** 停止代理服务 */
  ipcMain.handle('proxy:stop', async () => {
    try {
      await proxyServer.stop()
      const status = proxyServer.getStatus()

      const win = getMainWindow()
      if (win) {
        win.webContents.send('proxy:status-changed', status)
      }

      trayManager?.updateStatus(status)

      return { success: true }
    } catch (err) {
      return { success: false, error: { code: ErrorCode.PROXY_START_FAILED, message: (err as Error).message } }
    }
  })

  /** 获取代理状态 */
  ipcMain.handle('proxy:status', async () => {
    return proxyServer.getStatus()
  })

  /** 设置活跃渠道 */
  ipcMain.handle('proxy:set-channel', async (_event, args: { channelId: string }) => {
    try {
      // 同步更新 ChannelStore 的 isActive 标记（Router 路由时查找此标记）
      channelStore.setActiveChannel(args.channelId)
      proxyServer.setActiveChannel(args.channelId)
      const status = proxyServer.getStatus()

      const win = getMainWindow()
      if (win) {
        win.webContents.send('proxy:status-changed', status)
      }

      return { success: true }
    } catch (err) {
      if (err instanceof AppError) {
        return { success: false, error: err.toJSON() }
      }
      return { success: false, error: { code: ErrorCode.PROXY_FORWARD_FAILED, message: (err as Error).message } }
    }
  })
}
