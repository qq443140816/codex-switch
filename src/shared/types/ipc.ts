import type {
  ProxyStatusInfo,
  Channel,
  CreateChannelDTO,
  UpdateChannelDTO,
  ClientInfo,
  ConfigBackup,
  RequestLog,
  LogFilters,
  AppSettings,
} from './index'

/** IPC 通道名称常量 */
export const IPC_CHANNELS = {
  // 代理服务
  PROXY_START: 'proxy:start',
  PROXY_STOP: 'proxy:stop',
  PROXY_STATUS: 'proxy:status',
  PROXY_SET_CHANNEL: 'proxy:set-channel',

  // 渠道管理
  CHANNEL_LIST: 'channel:list',
  CHANNEL_GET: 'channel:get',
  CHANNEL_CREATE: 'channel:create',
  CHANNEL_UPDATE: 'channel:update',
  CHANNEL_DELETE: 'channel:delete',
  CHANNEL_TEST: 'channel:test',

  // 客户端配置
  CLIENT_LIST: 'client:list',
  CLIENT_SWITCH_CHANNEL: 'client:switch-channel',
  CLIENT_RESTORE: 'client:restore',
  CLIENT_BACKUPS: 'client:backups',

  // 日志
  LOG_LIST: 'log:list',
  LOG_CLEAR: 'log:clear',

  // 设置
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // 事件推送（主进程→渲染进程）
  PROXY_STATUS_CHANGED: 'proxy:status-changed',
  LOG_NEW: 'log:new',
  CLIENT_CONFIG_CHANGED: 'client:config-changed',
} as const

/** IPC 调用参数与返回值类型映射 */
export interface IpcChannelMap {
  // 代理服务
  'proxy:start': { args: { port: number }; result: { success: boolean; port: number } }
  'proxy:stop': { args: void; result: { success: boolean } }
  'proxy:status': { args: void; result: ProxyStatusInfo }
  'proxy:set-channel': { args: { channelId: string }; result: { success: boolean } }

  // 渠道管理
  'channel:list': { args: void; result: Channel[] }
  'channel:get': { args: { id: string }; result: Channel }
  'channel:create': { args: CreateChannelDTO; result: Channel }
  'channel:update': { args: { id: string } & UpdateChannelDTO; result: Channel }
  'channel:delete': { args: { id: string }; result: { success: boolean } }
  'channel:test': { args: { id: string }; result: { success: boolean; latency: number; models: string[] } }

  // 客户端配置
  'client:list': { args: void; result: ClientInfo[] }
  'client:switch-channel': { args: { clientType: string; channelId: string }; result: { success: boolean; backupId: string } }
  'client:restore': { args: { clientType: string; backupId: string }; result: { success: boolean } }
  'client:backups': { args: { clientType: string }; result: ConfigBackup[] }

  // 日志
  'log:list': { args: LogFilters; result: RequestLog[] }
  'log:clear': { args: void; result: { success: boolean } }

  // 设置
  'settings:get': { args: void; result: AppSettings }
  'settings:update': { args: Partial<AppSettings>; result: AppSettings }
}
