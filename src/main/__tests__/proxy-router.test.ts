import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RequestRouter } from '../proxy/router'
import { ChannelStore } from '../store/channel-store'
import { ServiceType, AppError, ErrorCode } from '../../shared/types'
import type { Channel } from '../../shared/types'

// Mock electron-store
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

describe('RequestRouter', () => {
  let channelStore: ChannelStore
  let router: RequestRouter

  beforeEach(() => {
    channelStore = new ChannelStore()
    router = new RequestRouter(channelStore)
  })

  describe('route', () => {
    it('should return the active channel', () => {
      const ch = channelStore.create({
        name: 'Active OpenAI',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key',
        models: ['gpt-4o'],
      })
      channelStore.update(ch.id, { isActive: true })

      const result = router.route('/v1/chat/completions', {})
      expect(result.id).toBe(ch.id)
      expect(result.isActive).toBe(true)
    })

    it('should throw AppError when no active channel exists', () => {
      expect(() => router.route('/v1/chat/completions', {})).toThrow()
    })

    it('should throw error with PROXY_FORWARD_FAILED code when no active channel', () => {
      try {
        router.route('/v1/chat/completions', {})
      } catch (err) {
        expect((err as AppError).code).toBe(ErrorCode.PROXY_FORWARD_FAILED)
        expect((err as AppError).message).toContain('活跃渠道')
      }
    })

    it('should return the only active channel among multiple channels', () => {
      const ch1 = channelStore.create({
        name: 'OpenAI',
        serviceType: ServiceType.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKeyEncrypted: 'key1',
        models: [],
      })
      const ch2 = channelStore.create({
        name: 'Claude',
        serviceType: ServiceType.CLAUDE,
        baseUrl: 'https://api.anthropic.com',
        apiKeyEncrypted: 'key2',
        models: [],
      })

      channelStore.update(ch2.id, { isActive: true })

      const result = router.route('/v1/chat/completions', {})
      expect(result.id).toBe(ch2.id)
      expect(result.serviceType).toBe(ServiceType.CLAUDE)
    })
  })

  describe('resolveTargetUrl', () => {
    const createChannel = (serviceType: ServiceType, baseUrl: string): Channel => ({
      id: 'test-id',
      name: 'Test Channel',
      serviceType,
      baseUrl,
      apiKeyEncrypted: 'key',
      models: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })

    it('should build OpenAI-compatible URL for OPENAI', () => {
      const channel = createChannel(ServiceType.OPENAI, 'https://api.openai.com')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions')
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('should build OpenAI-compatible URL for DEEPSEEK', () => {
      const channel = createChannel(ServiceType.DEEPSEEK, 'https://api.deepseek.com')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions')
      expect(url).toBe('https://api.deepseek.com/v1/chat/completions')
    })

    it('should build OpenAI-compatible URL for QWEN', () => {
      const channel = createChannel(ServiceType.QWEN, 'https://dashscope.aliyuncs.com/compatible-mode')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions')
      expect(url).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
    })

    it('should build OpenAI-compatible URL for ZHIPU', () => {
      const channel = createChannel(ServiceType.ZHIPU, 'https://open.bigmodel.cn/api/paas')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions')
      expect(url).toBe('https://open.bigmodel.cn/api/paas/v1/chat/completions')
    })

    it('should build Claude Messages API URL for CLAUDE', () => {
      const channel = createChannel(ServiceType.CLAUDE, 'https://api.anthropic.com')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions')
      expect(url).toBe('https://api.anthropic.com/v1/messages')
    })

    it('should build Gemini API URL with model from body', () => {
      const channel = createChannel(ServiceType.GEMINI, 'https://generativelanguage.googleapis.com')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions', {
        model: 'gemini-1.5-pro',
      })
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent')
    })

    it('should use default gemini model when body has no model', () => {
      const channel = createChannel(ServiceType.GEMINI, 'https://generativelanguage.googleapis.com')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions')
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
    })

    it('should use default gemini model when body is undefined', () => {
      const channel = createChannel(ServiceType.GEMINI, 'https://generativelanguage.googleapis.com')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions', undefined)
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
    })

    it('should strip trailing slashes from baseUrl', () => {
      const channel = createChannel(ServiceType.OPENAI, 'https://api.openai.com///')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions')
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('should fall back to direct path concatenation for CUSTOM type', () => {
      const channel = createChannel(ServiceType.CUSTOM, 'https://custom.api.com')
      const url = router.resolveTargetUrl(channel, '/v1/chat/completions')
      expect(url).toBe('https://custom.api.com/v1/chat/completions')
    })

    it('should ignore path parameter for Claude and always use /v1/messages', () => {
      const channel = createChannel(ServiceType.CLAUDE, 'https://api.anthropic.com')
      const url = router.resolveTargetUrl(channel, '/some/other/path')
      expect(url).toBe('https://api.anthropic.com/v1/messages')
    })
  })
})
