import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'
import { Channel, CreateChannelDTO, UpdateChannelDTO, ServiceType, AppError, ErrorCode } from '../../shared/types'

/** 渠道数据存储 */
export class ChannelStore {
  private readonly store: Store<{ channels: Channel[] }>

  constructor() {
    this.store = new Store<{ channels: Channel[] }>({
      name: 'config',
      defaults: {
        channels: [],
      },
    })
  }

  /** 获取所有渠道 */
  list(): Channel[] {
    try {
      return this.store.get('channels', [])
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `读取渠道列表失败: ${(err as Error).message}`)
    }
  }

  /** 根据 ID 获取渠道 */
  get(id: string): Channel | null {
    const channels = this.list()
    return channels.find((ch) => ch.id === id) ?? null
  }

  /** 创建渠道 */
  create(data: CreateChannelDTO & { apiKeyEncrypted: string }): Channel {
    try {
      const channels = this.list()
      const now = new Date().toISOString()

      const channel: Channel = {
        id: uuidv4(),
        name: data.name,
        serviceType: data.serviceType,
        baseUrl: data.baseUrl,
        proxyBaseUrl: data.proxyBaseUrl ?? null, // null = 走本机代理
        apiKeyEncrypted: data.apiKeyEncrypted,
        models: data.models,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      }

      channels.push(channel)
      this.store.set('channels', channels)
      return channel
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `创建渠道失败: ${(err as Error).message}`)
    }
  }

  /** 更新渠道 */
  update(id: string, data: UpdateChannelDTO & { apiKeyEncrypted?: string }): Channel {
    try {
      const channels = this.list()
      const index = channels.findIndex((ch) => ch.id === id)

      if (index === -1) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${id} 不存在`)
      }

      const existing = channels[index]
      const updated: Channel = {
        ...existing,
        name: data.name ?? existing.name,
        serviceType: data.serviceType ?? existing.serviceType,
        baseUrl: data.baseUrl ?? existing.baseUrl,
        proxyBaseUrl: data.proxyBaseUrl !== undefined ? data.proxyBaseUrl : existing.proxyBaseUrl,
        apiKeyEncrypted: data.apiKeyEncrypted ?? existing.apiKeyEncrypted,
        models: data.models ?? existing.models,
        isActive: data.isActive ?? existing.isActive,
        updatedAt: new Date().toISOString(),
      }

      // 如果设置了 isActive=true，需将其他渠道设为非活跃
      if (updated.isActive) {
        channels.forEach((ch) => {
          ch.isActive = false
        })
      }

      channels[index] = updated
      this.store.set('channels', channels)
      return updated
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `更新渠道失败: ${(err as Error).message}`)
    }
  }

  /** 删除渠道 */
  delete(id: string): void {
    try {
      const channels = this.list()
      const filtered = channels.filter((ch) => ch.id !== id)

      if (filtered.length === channels.length) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${id} 不存在`)
      }

      this.store.set('channels', filtered)
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `删除渠道失败: ${(err as Error).message}`)
    }
  }

  /** 获取活跃渠道 */
  getActiveChannel(): Channel | null {
    const channels = this.list()
    return channels.find((ch) => ch.isActive) ?? null
  }

  /** 设置活跃渠道 */
  setActiveChannel(id: string): void {
    const channels = this.list()
    const target = channels.find((ch) => ch.id === id)
    if (!target) {
      throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${id} 不存在`)
    }

    channels.forEach((ch) => {
      ch.isActive = ch.id === id
    })

    this.store.set('channels', channels)
  }
}
