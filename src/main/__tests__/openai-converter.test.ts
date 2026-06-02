import { describe, it, expect } from 'vitest'
import { OpenAIConverter } from '../converter/openai'
import { ServiceType } from '../../shared/types'
import type { OpenAIChatRequest, OpenAIChatResponse } from '../../shared/types'

describe('OpenAIConverter', () => {
  const converter = new OpenAIConverter()

  describe('serviceType', () => {
    it('should have OPENAI as serviceType', () => {
      expect(converter.serviceType).toBe(ServiceType.OPENAI)
    })
  })

  describe('convertRequest', () => {
    it('should return the request as-is (pass-through)', () => {
      const req: OpenAIChatRequest = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }

      const result = converter.convertRequest(req)
      expect(result).toBe(req) // Same reference (pass-through)
    })

    it('should return the same request object even for minimal request', () => {
      const req: OpenAIChatRequest = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Hi' },
        ],
      }

      const result = converter.convertRequest(req)
      expect(result).toBe(req)
      expect(result.model).toBe('gpt-4o-mini')
      expect(result.messages).toHaveLength(1)
    })
  })

  describe('convertResponse', () => {
    it('should return the response as-is (pass-through)', () => {
      const res: OpenAIChatResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1700000000,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      }

      const result = converter.convertResponse(res)
      expect(result).toBe(res) // Same reference (pass-through)
    })

    it('should cast unknown response to OpenAIChatResponse', () => {
      const res = {
        id: 'chatcmpl-456',
        object: 'chat.completion',
        created: 1700000001,
        model: 'gpt-4o-mini',
        choices: [],
      }

      const result = converter.convertResponse(res)
      expect(result.id).toBe('chatcmpl-456')
      expect(result.object).toBe('chat.completion')
    })
  })
})
