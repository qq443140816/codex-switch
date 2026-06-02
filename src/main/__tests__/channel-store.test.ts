import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ChannelStore } from '../store/channel-store'
import { ServiceType, AppError, ErrorCode } from '../../shared/types'
import type { Channel } from '../../shared/types'

// Mock electron-store
const storeData: Record<string, unknown> = {}

vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      private data: Record<string, unknown>

      constructor(options: { defaults?: Record<string, unknown> }) {
        this.data = { ...(options.defaults || {}) }
      }

      get(key: string, defaultValue?: unknown): unknown {
        if (key in this.data) return this.data[key]
        return defaultValue
      }

      set(key: string, value: unknown): void {
        this.data[key] = value
      }
    },
  }
})

describe('ChannelStore', () => {
  let channelStore: ChannelStore

  beforeEach(() => {
    vi.clearAllMocks()
    channelStore = new ChannelStore()
  })

  const createTestChannel = (overrides?: Partial<Channel>): Channel => ({
    id: 'test-id-1',
    name: 'Test OpenAI Channel',
    serviceType: ServiceType.OPENAI,
    baseUrl: 'https://api.openai.com',
    apiKeyEncrypted: 'encrypted-key-1',
    models: ['gpt-4o', 'gpt-4o-mini'],
    isActive: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  })

  describe('list', () => {
    it('should return empty array when no channels exist', () => {
      const result = channelStore.list()
      expect(result).toEqual([])
    })

    it('should return all channels', () => {
      // Use create to add a channel
      channelStore.create({
        name: 'Test Channel',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'enc-key',
        models: ['gpt-4o'],
      })

      const result = channelStore.list()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Channel')
    })
  })

  describe('create', () => {
    it('should create a channel with provided data', () => {
      const channel = channelStore.create({
        name: 'OpenAI Channel',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'encrypted-key',
        models: ['gpt-4o', 'gpt-4o-mini'],
      })

      expect(channel.id).toBeDefined()
      expect(channel.name).toBe('OpenAI Channel')
      expect(channel.serviceType).toBe(ServiceType.OPENAI)
      expect(channel.baseUrl).toBe('https://api.openai.com')
      expect(channel.apiKeyEncrypted).toBe('encrypted-key')
      expect(channel.models).toEqual(['gpt-4o', 'gpt-4o-mini'])
      expect(channel.isActive).toBe(false)
      expect(channel.createdAt).toBeDefined()
      expect(channel.updatedAt).toBeDefined()
    })

    it('should auto-generate a UUID as id', () => {
      const channel = channelStore.create({
        name: 'Test',
        serviceType: ServiceType.CLAUDE,
        baseUrl: 'https://api.anthropic.com',
        apiKeyEncrypted: 'key',
        models: [],
      })

      expect(channel.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('should set isActive to false by default', () => {
      const channel = channelStore.create({
        name: 'Test',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: [],
      })

      expect(channel.isActive).toBe(false)
    })

    it('should persist the channel so list() returns it', () => {
      channelStore.create({
        name: 'Persisted',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: ['gpt-4o'],
      })

      const channels = channelStore.list()
      expect(channels).toHaveLength(1)
      expect(channels[0].name).toBe('Persisted')
    })
  })

  describe('get', () => {
    it('should return channel by id', () => {
      const created = channelStore.create({
        name: 'GetTest',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: [],
      })

      const found = channelStore.get(created.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.name).toBe('GetTest')
    })

    it('should return null when channel does not exist', () => {
      const result = channelStore.get('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update channel name', () => {
      const created = channelStore.create({
        name: 'Original',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: [],
      })

      const updated = channelStore.update(created.id, { name: 'Updated' })
      expect(updated.name).toBe('Updated')
    })

    it('should update baseUrl', () => {
      const created = channelStore.create({
        name: 'Test',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: [],
      })

      const updated = channelStore.update(created.id, { baseUrl: 'https://new-url.com' })
      expect(updated.baseUrl).toBe('https://new-url.com')
    })

    it('should preserve unspecified fields', () => {
      const created = channelStore.create({
        name: 'Original',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: ['gpt-4o'],
      })

      const updated = channelStore.update(created.id, { name: 'New Name' })
      expect(updated.name).toBe('New Name')
      expect(updated.baseUrl).toBe('https://api.openai.com')
      expect(updated.models).toEqual(['gpt-4o'])
    })

    it('should set isActive and deactivate other channels', () => {
      const ch1 = channelStore.create({
        name: 'Channel 1',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key1',
        models: [],
      })
      const ch2 = channelStore.create({
        name: 'Channel 2',
        serviceType: ServiceType.CLAUDE,
        baseUrl: 'https://api.anthropic.com',
        apiKeyEncrypted: 'key2',
        models: [],
      })

      // First activate ch1
      channelStore.update(ch1.id, { isActive: true })
      expect(channelStore.get(ch1.id)!.isActive).toBe(true)

      // Activate ch2, ch1 should be deactivated
      channelStore.update(ch2.id, { isActive: true })
      expect(channelStore.get(ch2.id)!.isActive).toBe(true)
      expect(channelStore.get(ch1.id)!.isActive).toBe(false)
    })

    it('should throw CHANNEL_NOT_FOUND when updating non-existent channel', () => {
      expect(() => channelStore.update('non-existent', { name: 'test' })).toThrow()
    })
  })

  describe('delete', () => {
    it('should remove the channel', () => {
      const created = channelStore.create({
        name: 'ToDelete',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: [],
      })

      channelStore.delete(created.id)
      expect(channelStore.get(created.id)).toBeNull()
    })

    it('should throw CHANNEL_NOT_FOUND when deleting non-existent channel', () => {
      expect(() => channelStore.delete('non-existent-id')).toThrow()
    })

    it('should not affect other channels', () => {
      const ch1 = channelStore.create({
        name: 'Keep',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key1',
        models: [],
      })
      const ch2 = channelStore.create({
        name: 'Delete',
        serviceType: ServiceType.CLAUDE,
        baseUrl: 'https://api.anthropic.com',
        apiKeyEncrypted: 'key2',
        models: [],
      })

      channelStore.delete(ch2.id)
      expect(channelStore.get(ch1.id)).not.toBeNull()
      expect(channelStore.list()).toHaveLength(1)
    })
  })

  describe('getActiveChannel', () => {
    it('should return null when no active channel', () => {
      expect(channelStore.getActiveChannel()).toBeNull()
    })

    it('should return the active channel', () => {
      const created = channelStore.create({
        name: 'Active',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: [],
      })

      channelStore.update(created.id, { isActive: true })
      const active = channelStore.getActiveChannel()
      expect(active).not.toBeNull()
      expect(active!.id).toBe(created.id)
    })
  })

  describe('setActiveChannel', () => {
    it('should set the specified channel as active', () => {
      const created = channelStore.create({
        name: 'Test',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: [],
      })

      channelStore.setActiveChannel(created.id)
      expect(channelStore.get(created.id)!.isActive).toBe(true)
    })

    it('should deactivate other channels when setting active', () => {
      const ch1 = channelStore.create({
        name: 'Ch1',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key1',
        models: [],
      })
      const ch2 = channelStore.create({
        name: 'Ch2',
        serviceType: ServiceType.CLAUDE,
        baseUrl: 'https://api.anthropic.com',
        apiKeyEncrypted: 'key2',
        models: [],
      })

      channelStore.setActiveChannel(ch1.id)
      channelStore.setActiveChannel(ch2.id)

      expect(channelStore.get(ch2.id)!.isActive).toBe(true)
      expect(channelStore.get(ch1.id)!.isActive).toBe(false)
    })

    it('should throw CHANNEL_NOT_FOUND when channel does not exist', () => {
      expect(() => channelStore.setActiveChannel('non-existent')).toThrow()
    })
  })
})
