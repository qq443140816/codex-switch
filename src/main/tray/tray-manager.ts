import { Tray, Menu, nativeImage, app } from 'electron'
import type { ProxyServer } from '../proxy/server'
import { ProxyStatus, ProxyStatusInfo } from '../../shared/types'

/** 32x32 蓝色托盘图标（base64 PNG） */
const TRAY_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGNwa9pCU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULAHAR8EweQtBOAAAAAElFTkSuQmCC'

/** 系统托盘管理器 */
export class TrayManager {
  private tray: Tray | null = null
  private readonly proxyServer: ProxyServer
  private readonly showWindow: () => void

  constructor(proxyServer: ProxyServer, showWindow: () => void) {
    this.proxyServer = proxyServer
    this.showWindow = showWindow
  }

  /** 创建系统托盘 */
  create(): void {
    const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`)
    this.tray = new Tray(icon)
    this.tray.setToolTip('Codex-Switch')

    // 左键点击托盘图标 → 显示主窗口
    this.tray.on('click', () => {
      this.showWindow()
    })

    // 右键时刷新菜单状态（确保始终反映最新代理状态）
    this.tray.on('right-click', () => {
      this.updateMenu()
    })

    this.updateMenu()
  }

  /** 更新托盘菜单（根据代理状态动态生成） */
  updateStatus(status: ProxyStatusInfo): void {
    if (!this.tray) return

    const statusText = status.status === ProxyStatus.RUNNING
      ? `● 运行中 (端口: ${status.port})`
      : status.status === ProxyStatus.ERROR
        ? '● 异常'
        : '○ 已停止'

    this.tray.setToolTip(`Codex-Switch - ${statusText}`)
    this.updateMenu()
  }

  /** 更新托盘菜单 */
  private updateMenu(): void {
    if (!this.tray) return

    const status = this.proxyServer.getStatus()
    const isRunning = status.status === ProxyStatus.RUNNING

    const contextMenu = Menu.buildFromTemplate([
      {
        label: isRunning ? '代理运行中' : '代理已停止',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: isRunning ? '停止代理' : '启动代理',
        click: async () => {
          try {
            if (isRunning) {
              await this.proxyServer.stop()
            } else {
              await this.proxyServer.start(status.port || 8080)
            }
            this.updateMenu()
          } catch (err) {
            console.error('切换代理状态失败:', err)
          }
        },
      },
      { type: 'separator' },
      {
        label: '显示主窗口',
        click: () => {
          this.showWindow()
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit()
        },
      },
    ])

    this.tray.setContextMenu(contextMenu)
  }

  /** 销毁托盘 */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
