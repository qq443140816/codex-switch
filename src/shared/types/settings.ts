/** 应用设置 */
export interface AppSettings {
  /** 代理服务监听端口 */
  proxyPort: number
  /** 应用启动时自动启动代理 */
  autoStartProxy: boolean
  /** 系统开机自启动 */
  autoLaunch: boolean
  /** 界面语言 */
  language: string
  /** 数据存储路径 */
  dataPath: string
  /** 启用请求日志记录 */
  loggingEnabled: boolean
}

/** 默认设置值 */
export const DEFAULT_SETTINGS: AppSettings = {
  proxyPort: 8080,
  autoStartProxy: true,
  autoLaunch: false,
  language: 'zh-CN',
  dataPath: '',
  loggingEnabled: true,
}
