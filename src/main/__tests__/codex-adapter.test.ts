import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CodexAdapter } from '../client-adapter/codex'
import { ClientType, ErrorCode } from '../../shared/types'

// ── Mock: fs ──
const mockExistsSync = vi.fn<(path: string) => boolean>()
const mockReadFileSync = vi.fn<(path: string, encoding: string) => string>()
const mockWriteFileSync = vi.fn<(path: string, data: string, encoding: string) => void>()

vi.mock('fs', () => ({
  existsSync: (...args: [string]) => mockExistsSync(...args),
  readFileSync: (...args: [string, string]) => mockReadFileSync(...args),
  writeFileSync: (...args: [string, string, string]) => mockWriteFileSync(...args),
}))

// ── Mock: smol-toml ──
const mockParse = vi.fn<(content: string) => Record<string, any>>()
const mockStringify = vi.fn<(data: any) => string>()

vi.mock('smol-toml', () => ({
  parse: (...args: [string]) => mockParse(...args),
  stringify: (...args: [any]) => mockStringify(...args),
}))

// ── Mock: BackupStore ──
vi.mock('../store/backup-store', () => ({
  BackupStore: class {
    create = vi.fn().mockReturnValue({ id: 'backup-1', clientId: ClientType.CODEX, filePath: '/mock', timestamp: new Date().toISOString(), size: 100 })
    restore = vi.fn()
    list = vi.fn().mockReturnValue([])
  },
}))

// ── Mock: os (homedir) ──
vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}))

describe('CodexAdapter', () => {
  let adapter: CodexAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new CodexAdapter()
  })

  // ──────── Basic Properties ────────

  it('should have clientType = codex', () => {
    expect(adapter.clientType).toBe(ClientType.CODEX)
  })

  it('should return config paths for config.toml and auth.json', () => {
    const paths = adapter.getConfigPaths()
    expect(paths).toHaveLength(2)
    expect(paths[0]).toContain('config.toml')
    expect(paths[1]).toContain('auth.json')
  })

  // ──────── detect() ────────

  describe('detect', () => {
    it('should return true when config.toml exists', () => {
      mockExistsSync.mockImplementation((p: string) => p.includes('config.toml'))
      expect(adapter.detect()).toBe(true)
    })

    it('should return true when auth.json exists', () => {
      mockExistsSync.mockImplementation((p: string) => p.includes('auth.json'))
      expect(adapter.detect()).toBe(true)
    })

    it('should return false when neither file exists', () => {
      mockExistsSync.mockReturnValue(false)
      expect(adapter.detect()).toBe(false)
    })
  })

  // ──────── readConfig() ────────

  describe('readConfig', () => {
    it('should read apiBaseUrl from model_providers.custom.base_url', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({
        model_provider: 'custom',
        model: 'gpt-4o',
        model_providers: {
          custom: { base_url: 'https://custom.api.com/v1' },
        },
      })
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({ OPENAI_API_KEY: 'sk-test-key' })
        return ''
      })

      const config = adapter.readConfig()
      expect(config.apiBaseUrl).toBe('https://custom.api.com/v1')
    })

    it('should read apiKey from auth.json OPENAI_API_KEY', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({
        model_provider: 'custom',
        model: 'gpt-4o',
        model_providers: { custom: { base_url: 'https://api.test.com' } },
      })
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({ OPENAI_API_KEY: 'sk-my-api-key' })
        return ''
      })

      const config = adapter.readConfig()
      expect(config.apiKey).toBe('sk-my-api-key')
    })

    it('should read model from toml model field', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({
        model_provider: 'custom',
        model: 'gpt-4o',
        model_providers: { custom: { base_url: 'https://api.test.com' } },
      })
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({ OPENAI_API_KEY: 'sk-key' })
        return ''
      })

      const config = adapter.readConfig()
      expect(config.model).toBe('gpt-4o')
    })

    it('should read apiBaseUrl from active provider when model_provider is set', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({
        model_provider: 'openai',
        model: 'gpt-4o',
        model_providers: {
          openai: { base_url: 'https://api.openai.com/v1' },
          custom: { base_url: 'https://custom.api.com' },
        },
      })
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({ OPENAI_API_KEY: 'sk-key' })
        return ''
      })

      const config = adapter.readConfig()
      // Should read from model_providers.openai.base_url since model_provider = 'openai'
      expect(config.apiBaseUrl).toBe('https://api.openai.com/v1')
    })

    it('should default to empty strings when config files do not exist', () => {
      mockExistsSync.mockReturnValue(false)

      const config = adapter.readConfig()
      expect(config.apiBaseUrl).toBe('')
      expect(config.apiKey).toBe('')
      expect(config.model).toBe('')
    })

    it('should return empty apiKey when auth.json does not exist', () => {
      mockExistsSync.mockImplementation((p: string) => p.includes('config.toml'))
      mockParse.mockReturnValue({
        model_provider: 'custom',
        model: 'gpt-4o',
        model_providers: { custom: { base_url: 'https://api.test.com' } },
      })

      const config = adapter.readConfig()
      expect(config.apiKey).toBe('')
    })

    it('should include tomlData and authData in extra', () => {
      mockExistsSync.mockReturnValue(true)
      const parsed = {
        model_provider: 'custom',
        model: 'gpt-4o',
        model_providers: { custom: { base_url: 'https://api.test.com' } },
      }
      mockParse.mockReturnValue(parsed)
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({ OPENAI_API_KEY: 'sk-key' })
        return ''
      })

      const config = adapter.readConfig()
      expect(config.extra.tomlData).toEqual(parsed)
      expect(config.extra.authData).toEqual({ OPENAI_API_KEY: 'sk-key' })
      expect(config.extra.activeProviderId).toBe('custom')
    })

    it('should throw AppError with CLIENT_CONFIG_READ_FAILED on parse error', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockImplementation(() => {
        throw new Error('TOML parse error')
      })

      try {
        adapter.readConfig()
        expect.fail('Should have thrown')
      } catch (err: unknown) {
        const error = err as { code: ErrorCode; message: string }
        expect(error.code).toBe(ErrorCode.CLIENT_CONFIG_READ_FAILED)
        expect(error.message).toContain('读取 Codex 配置失败')
      }
    })
  })

  // ──────── writeConfig() ────────

  describe('writeConfig', () => {
    it('should set model_provider = "custom"', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({
        model: 'old-model',
        model_providers: { custom: { base_url: 'https://old.com' } },
      })
      mockStringify.mockReturnValue('toml-output')
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({ OPENAI_API_KEY: 'old-key' })
        return ''
      })

      adapter.writeConfig({
        apiBaseUrl: 'https://new.api.com',
        apiKey: 'sk-new-key',
        model: 'gpt-4o',
        extra: {},
      })

      // Check what was passed to stringify — it should have model_provider = 'custom'
      const tomlData = mockStringify.mock.calls[0][0] as Record<string, any>
      expect(tomlData.model_provider).toBe('custom')
    })

    it('should write [model_providers.custom] section with base_url', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({
        model: 'old-model',
        model_providers: {},
      })
      mockStringify.mockReturnValue('toml-output')
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({})
        return ''
      })

      adapter.writeConfig({
        apiBaseUrl: 'https://custom.api.com/v1',
        apiKey: 'sk-key',
        model: 'gpt-4o',
        extra: {},
      })

      const tomlData = mockStringify.mock.calls[0][0] as Record<string, any>
      expect(tomlData.model_providers.custom).toBeDefined()
      expect(tomlData.model_providers.custom.base_url).toBe('https://custom.api.com/v1')
    })

    it('should preserve existing TOML sections when writing', () => {
      const existingToml = {
        model: 'old-model',
        model_provider: 'openai',
        model_providers: {
          openai: { base_url: 'https://api.openai.com', name: 'openai' },
        },
        some_other_section: { key: 'value' },
      }
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue(existingToml)
      mockStringify.mockReturnValue('toml-output')
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({})
        return ''
      })

      adapter.writeConfig({
        apiBaseUrl: 'https://custom.api.com',
        apiKey: 'sk-key',
        model: 'gpt-4o',
        extra: {},
      })

      const tomlData = mockStringify.mock.calls[0][0] as Record<string, any>
      // Existing section should be preserved
      expect(tomlData.some_other_section).toEqual({ key: 'value' })
      expect(tomlData.model_providers.openai).toEqual({ base_url: 'https://api.openai.com', name: 'openai' })
    })

    it('should write OPENAI_API_KEY to auth.json', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({ model: 'gpt-4o', model_providers: {} })
      mockStringify.mockReturnValue('toml-output')
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({})
        return ''
      })

      adapter.writeConfig({
        apiBaseUrl: 'https://custom.api.com',
        apiKey: 'sk-my-new-key',
        model: 'gpt-4o',
        extra: {},
      })

      // Find the writeFileSync call for auth.json
      const authCall = mockWriteFileSync.mock.calls.find(
        (call: [string, string, string]) => call[0].includes('auth.json')
      )
      expect(authCall).toBeDefined()
      const writtenData = JSON.parse(authCall![1])
      expect(writtenData.OPENAI_API_KEY).toBe('sk-my-new-key')
    })

    it('should set custom provider fields: name, wire_api, requires_openai_auth', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({ model: 'gpt-4o', model_providers: {} })
      mockStringify.mockReturnValue('toml-output')
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({})
        return ''
      })

      adapter.writeConfig({
        apiBaseUrl: 'https://custom.api.com',
        apiKey: 'sk-key',
        model: 'gpt-4o',
        extra: {},
      })

      const tomlData = mockStringify.mock.calls[0][0] as Record<string, any>
      expect(tomlData.model_providers.custom.name).toBe('custom')
      expect(tomlData.model_providers.custom.wire_api).toBe('responses')
      expect(tomlData.model_providers.custom.requires_openai_auth).toBe(true)
    })

    it('should set auth_mode to apikey in auth.json', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({ model: 'gpt-4o', model_providers: {} })
      mockStringify.mockReturnValue('toml-output')
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({})
        return ''
      })

      adapter.writeConfig({
        apiBaseUrl: 'https://custom.api.com',
        apiKey: 'sk-key',
        model: 'gpt-4o',
        extra: {},
      })

      const authCall = mockWriteFileSync.mock.calls.find(
        (call: [string, string, string]) => call[0].includes('auth.json')
      )
      expect(authCall).toBeDefined()
      const writtenData = JSON.parse(authCall![1])
      expect(writtenData.auth_mode).toBe('apikey')
    })

    it('should preserve existing auth.json fields when writing', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({ model: 'gpt-4o', model_providers: {} })
      mockStringify.mockReturnValue('toml-output')
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({ existing_field: 'preserved', OPENAI_API_KEY: 'old-key' })
        return ''
      })

      adapter.writeConfig({
        apiBaseUrl: 'https://custom.api.com',
        apiKey: 'sk-new-key',
        model: 'gpt-4o',
        extra: {},
      })

      const authCall = mockWriteFileSync.mock.calls.find(
        (call: [string, string, string]) => call[0].includes('auth.json')
      )
      expect(authCall).toBeDefined()
      const writtenData = JSON.parse(authCall![1])
      expect(writtenData.existing_field).toBe('preserved')
      expect(writtenData.OPENAI_API_KEY).toBe('sk-new-key')
    })

    it('should throw AppError with CLIENT_CONFIG_WRITE_FAILED on write error', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockImplementation(() => {
        throw new Error('TOML parse error')
      })

      try {
        adapter.writeConfig({
          apiBaseUrl: 'https://custom.api.com',
          apiKey: 'sk-key',
          model: 'gpt-4o',
          extra: {},
        })
        expect.fail('Should have thrown')
      } catch (err: unknown) {
        const error = err as { code: ErrorCode; message: string }
        expect(error.code).toBe(ErrorCode.CLIENT_CONFIG_WRITE_FAILED)
        expect(error.message).toContain('写入 Codex 配置失败')
      }
    })

    it('should create model_providers section if not present', () => {
      mockExistsSync.mockReturnValue(true)
      mockParse.mockReturnValue({ model: 'gpt-4o' })
      mockStringify.mockReturnValue('toml-output')
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('auth.json')) return JSON.stringify({})
        return ''
      })

      adapter.writeConfig({
        apiBaseUrl: 'https://custom.api.com',
        apiKey: 'sk-key',
        model: 'gpt-4o',
        extra: {},
      })

      const tomlData = mockStringify.mock.calls[0][0] as Record<string, any>
      expect(tomlData.model_providers).toBeDefined()
      expect(tomlData.model_providers.custom).toBeDefined()
    })
  })
})
