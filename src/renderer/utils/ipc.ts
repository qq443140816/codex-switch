/**
 * IPC 调用封装 — 类型安全
 * 
 * 渲染进程通过 window.api 调用主进程能力
 * 类型定义与 preload/index.ts 中的暴露接口一致
 */

// 声明 window.api 类型扩展
declare global {
  interface Window {
    api: {
      proxy: {
        start: (port: number) => Promise<{ success: boolean; port: number }>
        stop: () => Promise<{ success: boolean }>
        status: () => Promise<import('../../shared/types').ProxyStatusInfo>
        setChannel: (channelId: string) => Promise<{ success: boolean }>
      }
      channel: {
        list: () => Promise<import('../../shared/types').Channel[]>
        get: (id: string) => Promise<import('../../shared/types').Channel>
        create: (data: import('../../shared/types').CreateChannelDTO) => Promise<import('../../shared/types').Channel>
        update: (id: string, updates: import('../../shared/types').UpdateChannelDTO) => Promise<import('../../shared/types').Channel>
        delete: (id: string) => Promise<{ success: boolean }>
        test: (id: string) => Promise<{ success: boolean; latency: number; models: string[] }>
      }
      client: {
        list: () => Promise<import('../../shared/types').ClientInfo[]>
        switchChannel: (clientType: string, channelId: string) => Promise<{ success: boolean; backupId: string }>
        restore: (clientType: string, backupId: string) => Promise<{ success: boolean }>
        backups: (clientType: string) => Promise<import('../../shared/types').ConfigBackup[]>
      }
      log: {
        list: (filters: import('../../shared/types').LogFilters) => Promise<import('../../shared/types').RequestLog[]>
        clear: () => Promise<{ success: boolean }>
      }
      settings: {
        get: () => Promise<import('../../shared/types').AppSettings>
        update: (partial: Partial<import('../../shared/types').AppSettings>) => Promise<import('../../shared/types').AppSettings>
      }
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}

/** IPC 调用工具 */
export const ipc = {
  proxy: {
    start: (port: number) => window.api.proxy.start(port),
    stop: () => window.api.proxy.stop(),
    status: () => window.api.proxy.status(),
    setChannel: (channelId: string) => window.api.proxy.setChannel(channelId),
  },
  channel: {
    list: () => window.api.channel.list(),
    get: (id: string) => window.api.channel.get(id),
    create: (data: import('../../shared/types').CreateChannelDTO) => window.api.channel.create(data),
    update: (id: string, updates: import('../../shared/types').UpdateChannelDTO) => window.api.channel.update(id, updates),
    delete: (id: string) => window.api.channel.delete(id),
    test: (id: string) => window.api.channel.test(id),
  },
  client: {
    list: () => window.api.client.list(),
    switchChannel: (clientType: string, channelId: string) => window.api.client.switchChannel(clientType, channelId),
    restore: (clientType: string, backupId: string) => window.api.client.restore(clientType, backupId),
    backups: (clientType: string) => window.api.client.backups(clientType),
  },
  log: {
    list: (filters: import('../../shared/types').LogFilters) => window.api.log.list(filters),
    clear: () => window.api.log.clear(),
  },
  settings: {
    get: () => window.api.settings.get(),
    update: (partial: Partial<import('../../shared/types').AppSettings>) => window.api.settings.update(partial),
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => window.api.on(channel, callback),
}
