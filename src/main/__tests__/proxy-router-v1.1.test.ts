import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RequestRouter } from '../proxy/router'
import { ChannelStore } from '../store/channel-store'
import { ServiceType } from '../../shared/types'
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

/**
 * v1.1 Router extension tests — specifically for /v1/responses path handling
 */
describe('RequestRouter v1.1 — Responses API path', () => {
  let channelStore: ChannelStore
  let router: RequestRouter

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

  beforeEach(() => {
    channelStore = new ChannelStore()
    router = new RequestRouter(channelStore)
  })

  describe('/v1/responses path', () => {
    it('should directly concatenate /v1/responses for OPENAI', () => {
      const channel = createChannel(ServiceType.OPENAI, 'https://api.openai.com')
      const url = router.resolveTargetUrl(channel, '/v1/responses')
      expect(url).toBe('https://api.openai.com/v1/responses')
    })

    it('should directly concatenate /v1/responses for DEEPSEEK', () => {
      const channel = createChannel(ServiceType.DEEPSEEK, 'https://api.deepseek.com')
      const url = router.resolveTargetUrl(channel, '/v1/responses')
      expect(url).toBe('https://api.deepseek.com/v1/responses')
    })

    it('should directly concatenate /v1/responses for QWEN', () => {
      const channel = createChannel(ServiceType.QWEN, 'https://dashscope.aliyuncs.com/compatible-mode')
      const url = router.resolveTargetUrl(channel, '/v1/responses')
      expect(url).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1/responses')
    })

    it('should directly concatenate /v1/responses for ZHIPU', () => {
      const channel = createChannel(ServiceType.ZHIPU, 'https://open.bigmodel.cn/api/paas')
      const url = router.resolveTargetUrl(channel, '/v1/responses')
      expect(url).toBe('https://open.bigmodel.cn/api/paas/v1/responses')
    })

    it('should map /v1/responses to /v1/messages for CLAUDE (same as /v1/chat/completions)', () => {
      const channel = createChannel(ServiceType.CLAUDE, 'https://api.anthropic.com')
      const url = router.resolveTargetUrl(channel, '/v1/responses')
      // Claude always maps to /v1/messages regardless of incoming path
      expect(url).toBe('https://api.anthropic.com/v1/messages')
    })

    it('should directly concatenate /v1/responses for CUSTOM', () => {
      const channel = createChannel(ServiceType.CUSTOM, 'https://custom.api.com')
      const url = router.resolveTargetUrl(channel, '/v1/responses')
      expect(url).toBe('https://custom.api.com/v1/responses')
    })

    it('should handle /v1/responses for GEMINI with model from body', () => {
      const channel = createChannel(ServiceType.GEMINI, 'https://generativelanguage.googleapis.com')
      const url = router.resolveTargetUrl(channel, '/v1/responses', { model: 'gemini-2.0-flash' })
      // Gemini always maps to its generateContent endpoint regardless of path
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
    })
  })
})
