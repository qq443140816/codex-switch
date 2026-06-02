import { describe, it, expect } from 'vitest'
import { ClaudeConverter } from '../converter/claude'
import { ServiceType } from '../../shared/types'
import type { OpenAIChatRequest, OpenAIChatResponse, ClaudeMessagesResponse } from '../../shared/types'

describe('ClaudeConverter', () => {
  const converter = new ClaudeConverter()

  describe('serviceType', () => {
    it('should have CLAUDE as serviceType', () => {
      expect(converter.serviceType).toBe(ServiceType.CLAUDE)
    })
  })

  describe('convertRequest (OpenAI → Claude)', () => {
    it('should extract system message as top-level "system" field', () => {
      const req: OpenAIChatRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' },
        ],
      }

      const result = converter.convertRequest(req)
      expect(result.system).toBe('You are a helpful assistant.')
    })

    it('should convert user and assistant messages to Claude format', () => {
      const req: OpenAIChatRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: 'Be concise.' },
          { role: 'user', content: 'What is 2+2?' },
          { role: 'assistant', content: '4' },
          { role: 'user', content: 'And 3+3?' },
        ],
      }

      const result = converter.convertRequest(req)
      expect(result.messages).toEqual([
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '4' },
        { role: 'user', content: 'And 3+3?' },
      ])
    })

    it('should not include system field when no system message exists', () => {
      const req: OpenAIChatRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Hello!' },
        ],
      }

      const result = converter.convertRequest(req)
      expect(result.system).toBeUndefined()
    })

    it('should set max_tokens from request or default to 4096', () => {
      const reqWithMaxTokens: OpenAIChatRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 2048,
      }

      const result1 = converter.convertRequest(reqWithMaxTokens)
      expect(result1.max_tokens).toBe(2048)

      const reqWithoutMaxTokens: OpenAIChatRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
      }

      const result2 = converter.convertRequest(reqWithoutMaxTokens)
      expect(result2.max_tokens).toBe(4096)
    })

    it('should include temperature when provided', () => {
      const req: OpenAIChatRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.5,
      }

      const result = converter.convertRequest(req)
      expect(result.temperature).toBe(0.5)
    })

    it('should not include temperature when not provided', () => {
      const req: OpenAIChatRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
      }

      const result = converter.convertRequest(req)
      expect(result.temperature).toBeUndefined()
    })

    it('should map model name correctly for known models', () => {
      const req: OpenAIChatRequest = {
        model: 'claude-3-opus',
        messages: [{ role: 'user', content: 'Hi' }],
      }

      const result = converter.convertRequest(req)
      expect(result.model).toBe('claude-3-opus-20240229')
    })

    it('should keep model name as-is for already-mapped model names', () => {
      const req: OpenAIChatRequest = {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'Hi' }],
      }

      const result = converter.convertRequest(req)
      expect(result.model).toBe('claude-sonnet-4-20250514')
    })

    it('should keep unknown model name unchanged', () => {
      const req: OpenAIChatRequest = {
        model: 'claude-future-model',
        messages: [{ role: 'user', content: 'Hi' }],
      }

      const result = converter.convertRequest(req)
      expect(result.model).toBe('claude-future-model')
    })
  })

  describe('convertResponse (Claude → OpenAI)', () => {
    it('should convert Claude text response to OpenAI format', () => {
      const claudeRes: ClaudeMessagesResponse = {
        id: 'msg_01XFDUDYJgAACzvnptpVo4El',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello! How can I help you?' },
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 8,
        },
      }

      const result = converter.convertResponse(claudeRes)

      expect(result.object).toBe('chat.completion')
      expect(result.model).toBe('claude-3-5-sonnet-20241022')
      expect(result.choices).toHaveLength(1)
      expect(result.choices[0].message.role).toBe('assistant')
      expect(result.choices[0].message.content).toBe('Hello! How can I help you?')
      expect(result.choices[0].finish_reason).toBe('stop')
      expect(result.choices[0].index).toBe(0)
    })

    it('should map stop_reason "end_turn" to "stop"', () => {
      const claudeRes: ClaudeMessagesResponse = {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'test' }],
        model: 'claude',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 3 },
      }

      const result = converter.convertResponse(claudeRes)
      expect(result.choices[0].finish_reason).toBe('stop')
    })

    it('should keep non-end_turn stop_reason as-is', () => {
      const claudeRes: ClaudeMessagesResponse = {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'test' }],
        model: 'claude',
        stop_reason: 'max_tokens',
        usage: { input_tokens: 5, output_tokens: 3 },
      }

      const result = converter.convertResponse(claudeRes)
      expect(result.choices[0].finish_reason).toBe('max_tokens')
    })

    it('should map usage fields from Claude to OpenAI format', () => {
      const claudeRes: ClaudeMessagesResponse = {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'test' }],
        model: 'claude',
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      }

      const result = converter.convertResponse(claudeRes)
      expect(result.usage).toEqual({
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      })
    })

    it('should handle response without usage', () => {
      const claudeRes = {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text' as const, text: 'test' }],
        model: 'claude',
        stop_reason: 'end_turn',
      }

      const result = converter.convertResponse(claudeRes)
      expect(result.usage).toBeUndefined()
    })

    it('should concatenate multiple text blocks', () => {
      const claudeRes = {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text' as const, text: 'Hello ' },
          { type: 'text' as const, text: 'World!' },
        ],
        model: 'claude',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 5 },
      }

      const result = converter.convertResponse(claudeRes)
      expect(result.choices[0].message.content).toBe('Hello World!')
    })

    it('should handle empty content array', () => {
      const claudeRes = {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'claude',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 0 },
      }

      const result = converter.convertResponse(claudeRes)
      expect(result.choices[0].message.content).toBe('')
    })

    it('should generate a UUID when Claude response id is missing', () => {
      const claudeRes = {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text' as const, text: 'test' }],
        model: 'claude',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 3 },
      }

      const result = converter.convertResponse(claudeRes)
      // Should have a generated UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })
})
