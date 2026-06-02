import { describe, it, expect, beforeEach } from 'vitest'
import { ConverterRegistry } from '../converter/registry'
import { OpenAIConverter } from '../converter/openai'
import { ClaudeConverter } from '../converter/claude'
import { ServiceType } from '../../shared/types'

describe('ConverterRegistry', () => {
  let registry: ConverterRegistry

  beforeEach(() => {
    registry = new ConverterRegistry()
  })

  describe('register', () => {
    it('should register a converter and make it retrievable', () => {
      const converter = new OpenAIConverter()
      registry.register(converter)
      expect(registry.has(ServiceType.OPENAI)).toBe(true)
    })

    it('should allow registering multiple converters of different types', () => {
      registry.register(new OpenAIConverter())
      registry.register(new ClaudeConverter())
      expect(registry.has(ServiceType.OPENAI)).toBe(true)
      expect(registry.has(ServiceType.CLAUDE)).toBe(true)
    })

    it('should overwrite when registering the same serviceType twice', () => {
      const converter1 = new OpenAIConverter()
      const converter2 = new OpenAIConverter()
      registry.register(converter1)
      registry.register(converter2)
      // Should still have only one entry for OPENAI
      expect(registry.getRegisteredTypes()).toEqual([ServiceType.OPENAI])
    })
  })

  describe('get', () => {
    it('should return the registered converter for a given serviceType', () => {
      const converter = new OpenAIConverter()
      registry.register(converter)
      const result = registry.get(ServiceType.OPENAI)
      expect(result).toBe(converter)
    })

    it('should throw AppError when converter is not found', () => {
      expect(() => registry.get(ServiceType.CLAUDE)).toThrow()
    })

    it('should throw AppError with PROXY_CONVERT_FAILED error code', () => {
      try {
        registry.get(ServiceType.GEMINI)
      } catch (err: unknown) {
        const error = err as { code: number; message: string }
        expect(error.code).toBe(1004) // ErrorCode.PROXY_CONVERT_FAILED
        expect(error.message).toContain('gemini')
      }
    })
  })

  describe('has', () => {
    it('should return false when no converter is registered', () => {
      expect(registry.has(ServiceType.OPENAI)).toBe(false)
    })

    it('should return true after registering a converter', () => {
      registry.register(new OpenAIConverter())
      expect(registry.has(ServiceType.OPENAI)).toBe(true)
    })
  })

  describe('getRegisteredTypes', () => {
    it('should return empty array when no converters are registered', () => {
      expect(registry.getRegisteredTypes()).toEqual([])
    })

    it('should return all registered service types', () => {
      registry.register(new OpenAIConverter())
      registry.register(new ClaudeConverter())
      const types = registry.getRegisteredTypes()
      expect(types).toContain(ServiceType.OPENAI)
      expect(types).toContain(ServiceType.CLAUDE)
      expect(types).toHaveLength(2)
    })
  })
})
