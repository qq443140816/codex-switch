import { contextBridge, ipcRenderer } from 'electron'
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
} from '../shared/types'

/** 安全的 IPC 调用封装 */
const api = {
  // ========== 代理服务 ==========
  proxy: {
    start: (port: number): Promise<{ success: boolean; port: number }> =>
      ipcRenderer.invoke('proxy:start', { port }),
    stop: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('proxy:stop'),
    status: (): Promise<ProxyStatusInfo> =>
      ipcRenderer.invoke('proxy:status'),
    setChannel: (channelId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('proxy:set-channel', { channelId }),
  },

  // ========== 渠道管理 ==========
  channel: {
    list: (): Promise<Channel[]> =>
      ipcRenderer.invoke('channel:list'),
    get: (id: string): Promise<Channel> =>
      ipcRenderer.invoke('channel:get', { id }),
    create: (data: CreateChannelDTO): Promise<Channel> =>
      ipcRenderer.invoke('channel:create', data),
    update: (id: string, updates: UpdateChannelDTO): Promise<Channel> =>
      ipcRenderer.invoke('channel:update', { id, ...updates }),
    delete: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('channel:delete', { id }),
    test: (id: string): Promise<{ success: boolean; latency: number; models: string[] }> =>
      ipcRenderer.invoke('channel:test', { id }),
  },

  // ========== 客户端配置 ==========
  client: {
    list: (): Promise<ClientInfo[]> =>
      ipcRenderer.invoke('client:list'),
    switchChannel: (clientType: string, channelId: string): Promise<{ success: boolean; backupId: string }> =>
      ipcRenderer.invoke('client:switch-channel', { clientType, channelId }),
    restore: (clientType: string, backupId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('client:restore', { clientType, backupId }),
    backups: (clientType: string): Promise<ConfigBackup[]> =>
      ipcRenderer.invoke('client:backups', { clientType }),
  },

  // ========== 日志 ==========
  log: {
    list: (filters: LogFilters): Promise<RequestLog[]> =>
      ipcRenderer.invoke('log:list', filters),
    clear: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('log:clear'),
  },

  // ========== 设置 ==========
  settings: {
    get: (): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:get'),
    update: (partial: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', partial),
  },

  // ========== 事件监听 ==========
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

// 通过 contextBridge 暴露安全 API 到渲染进程
contextBridge.exposeInMainWorld('api', api)
