import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { ProxyServer } from './proxy/server'
import { ChannelStore } from './store/channel-store'
import { LogStore } from './store/log-store'
import { SettingsStore } from './store/settings-store'
import { BackupStore } from './store/backup-store'
import { KeyVault } from './crypto/key-vault'
import { ConverterRegistry } from './converter/registry'
import { OpenAIConverter } from './converter/openai'
import { ClaudeConverter } from './converter/claude'
import { DeepSeekConverter } from './converter/deepseek'
import { GeminiConverter } from './converter/gemini'
import { QwenConverter } from './converter/qwen'
import { ZhipuConverter } from './converter/zhipu'
import { ClientAdapterRegistry } from './client-adapter/registry'
import { CodexAdapter } from './client-adapter/codex'
import { WorkBuddyAdapter } from './client-adapter/workbuddy'
import { QorderAdapter } from './client-adapter/qorder'
import { OpenClawAdapter } from './client-adapter/openclaw'
import { TrayManager } from './tray/tray-manager'

let mainWindow: BrowserWindow | null = null
let proxyServer: ProxyServer | null = null
let trayManager: TrayManager | null = null
let isQuitting = false

/** 核心单例（延迟初始化，app ready 后才可创建） */
let keyVault: KeyVault
let channelStore: ChannelStore
let logStore: LogStore
let settingsStore: SettingsStore
let backupStore: BackupStore
let converterRegistry: ConverterRegistry
let clientAdapterRegistry: ClientAdapterRegistry

/** 注册所有协议转换器 */
function initConverters(): void {
  converterRegistry.register(new OpenAIConverter())
  converterRegistry.register(new ClaudeConverter())
  converterRegistry.register(new DeepSeekConverter())
  converterRegistry.register(new GeminiConverter())
  converterRegistry.register(new QwenConverter())
  converterRegistry.register(new ZhipuConverter())
}

/** 注册所有客户端适配器 */
function initClientAdapters(): void {
  clientAdapterRegistry.register(new CodexAdapter())
  clientAdapterRegistry.register(new WorkBuddyAdapter())
  clientAdapterRegistry.register(new QorderAdapter())
  clientAdapterRegistry.register(new OpenClawAdapter())
}

/** 创建主窗口 */
function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发环境加载 dev server
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    // 生产环境：renderer 在 extraResources/renderer/ 下，用 process.resourcesPath
    const rendererPath = app.isPackaged
      ? join(process.resourcesPath, 'renderer/index.html')
      : join(__dirname, '../renderer/index.html')
    win.loadFile(rendererPath)
  }

  win.on('closed', () => {
    mainWindow = null
  })

  // 关闭窗口时隐藏到托盘（Windows/Linux），真正退出走托盘菜单
  win.on('close', (event) => {
    if (!isQuitting && process.platform !== 'darwin') {
      event.preventDefault()
      win.hide()
    }
  })

  // 外部链接在系统浏览器中打开
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // F12 打开 DevTools（方便排查渲染器问题）
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools()
    }
  })

  return win
}

/** 应用启动入口 */
app.whenReady().then(() => {
  // 初始化核心单例（依赖 Electron app ready）
  keyVault = new KeyVault()
  channelStore = new ChannelStore()
  logStore = new LogStore()
  settingsStore = new SettingsStore()
  backupStore = new BackupStore()
  converterRegistry = new ConverterRegistry()
  clientAdapterRegistry = new ClientAdapterRegistry()

  // 初始化转换器和适配器
  initConverters()
  initClientAdapters()

  // 注入 ChannelStore 到 ClientAdapterRegistry（用于匹配 linkedChannelId）
  clientAdapterRegistry.setChannelStore(channelStore)
  clientAdapterRegistry.setSettingsStore(settingsStore)

  // 创建代理服务器实例
  proxyServer = new ProxyServer(
    channelStore,
    logStore,
    settingsStore,
    converterRegistry,
    keyVault
  )

  // 创建主窗口
  mainWindow = createMainWindow()
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 注册 IPC 处理器
  registerIpcHandlers({
    proxyServer,
    channelStore,
    logStore,
    settingsStore,
    backupStore,
    keyVault,
    converterRegistry,
    clientAdapterRegistry,
    trayManager,
    getMainWindow: () => mainWindow,
  })

  // 创建系统托盘
  trayManager = new TrayManager(proxyServer, () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      mainWindow = createMainWindow()
    }
  })
  trayManager.create()

  // 读取设置，如果配置了自动启动代理则启动
  const settings = settingsStore.get()
  if (settings.autoStartProxy && proxyServer) {
    proxyServer.start(settings.proxyPort).then(() => {
      trayManager?.updateStatus(proxyServer.getStatus())
    }).catch((err) => {
      console.error('自动启动代理失败:', err)
    })
  }

  // 检测已安装的客户端
  const clientInfos = clientAdapterRegistry.detectAll()
  console.log(`检测到 ${clientInfos.filter((c) => c.detected).length} 个已安装客户端`)

  // macOS 激活窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    } else {
      mainWindow?.show()
    }
  })
})

// 所有窗口关闭时不退出（由托盘控制生命周期）
app.on('window-all-closed', () => {
  // macOS 默认行为：不退出
  // Windows/Linux：窗口关闭 = 隐藏到托盘，不退出
})

// 应用退出前清理
app.on('before-quit', async () => {
  isQuitting = true
  if (proxyServer) {
    await proxyServer.stop()
  }
  if (trayManager) {
    trayManager.destroy()
  }
})

// 阻止多个实例
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
