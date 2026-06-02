import { describe, it, expect } from 'vitest'
import { OpenAIConverter } from '../converter/openai'
import { ClaudeConverter } from '../converter/claude'
import { DeepSeekConverter } from '../converter/deepseek'
import { GeminiConverter } from '../converter/gemini'
import { QwenConverter } from '../converter/qwen'
import { ZhipuConverter } from '../converter/zhipu'
import { ServiceType } from '../../shared/types'

/**
 * v1.1 Converter interface extension tests — supportsStreamingConversion property
 */
describe('Converter v1.1 — supportsStreamingConversion', () => {
  it('OpenAIConverter should have supportsStreamingConversion = false', () => {
    const converter = new OpenAIConverter()
    expect(converter.supportsStreamingConversion).toBe(false)
    expect(converter.serviceType).toBe(ServiceType.OPENAI)
  })

  it('ClaudeConverter should have supportsStreamingConversion = false', () => {
    const converter = new ClaudeConverter()
    expect(converter.supportsStreamingConversion).toBe(false)
    expect(converter.serviceType).toBe(ServiceType.CLAUDE)
  })

  it('DeepSeekConverter should have supportsStreamingConversion = false', () => {
    const converter = new DeepSeekConverter()
    expect(converter.supportsStreamingConversion).toBe(false)
    expect(converter.serviceType).toBe(ServiceType.DEEPSEEK)
  })

  it('GeminiConverter should have supportsStreamingConversion = false', () => {
    const converter = new GeminiConverter()
    expect(converter.supportsStreamingConversion).toBe(false)
    expect(converter.serviceType).toBe(ServiceType.GEMINI)
  })

  it('QwenConverter should have supportsStreamingConversion = false', () => {
    const converter = new QwenConverter()
    expect(converter.supportsStreamingConversion).toBe(false)
    expect(converter.serviceType).toBe(ServiceType.QWEN)
  })

  it('ZhipuConverter should have supportsStreamingConversion = false', () => {
    const converter = new ZhipuConverter()
    expect(converter.supportsStreamingConversion).toBe(false)
    expect(converter.serviceType).toBe(ServiceType.ZHIPU)
  })
})
