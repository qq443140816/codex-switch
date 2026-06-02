import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkBuddyAdapter } from '../client-adapter/workbuddy'
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

// ── Mock: BackupStore ──
vi.mock('../store/backup-store', () => ({
  BackupStore: class {
    create = vi.fn().mockReturnValue({ id: 'backup-1', clientId: ClientType.WORKBUDDY, filePath: '/mock', timestamp: new Date().toISOString(), size: 100 })
    restore = vi.fn()
    list = vi.fn().mockReturnValue([])
  },
}))

// ── Mock: os (homedir) ──
vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}))

describe('WorkBuddyAdapter', () => {
  let adapter: WorkBuddyAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new WorkBuddyAdapter()
  })

  // ──────── Basic Properties ────────

  it('should have clientType = workbuddy', () => {
    expect(adapter.clientType).toBe(ClientType.WORKBUDDY)
  })

  it('should return models.json path in getConfigPaths', () => {
    const paths = adapter.getConfigPaths()
    expect(paths).toHaveLength(1)
    expect(paths[0]).toContain('models.json')
    expect(paths[0]).toContain('.workbuddy')
  })

  // ──────── detect() ────────

  describe('detect', () => {
    it('should return true when models.json exists', () => {
      mockExistsSync.mockReturnValue(true)
      expect(adapter.detect()).toBe(true)
    })

    it('should return false when models.json does not exist', () => {
      mockExistsSync.mockReturnValue(false)
      expect(adapter.detect()).toBe(false)
    })
  })

  // ──────── readConfig() ────────

  describe('readConfig', () => {
    it('should read config from models.json array (first element)', () => {
      mockExistsSync.mockReturnValue(true)
      const modelsData = [
        {
          id: 'gpt-4o',
          name: 'gpt-4o',
          vendor: 'Custom',
          url: 'http://localhost:3000/v1',
          apiKey: 'sk-test-key',
        },
        {
          id: 'claude-3',
          name: 'Claude 3',
          vendor: 'Anthropic',
          url: 'https://api.anthropic.com',
          apiKey: 'sk-ant-key',
        },
      ]
      mockReadFileSync.mockReturnValue(JSON.stringify(modelsData))

      const config = adapter.readConfig()
      // Should read from the first element
      expect(config.apiBaseUrl).toBe('http://localhost:3000/v1')
      expect(config.apiKey).toBe('sk-test-key')
      expect(config.model).toBe('gpt-4o')
    })

    it('should return empty strings when array is empty', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify([]))

      const config = adapter.readConfig()
      expect(config.apiBaseUrl).toBe('')
      expect(config.apiKey).toBe('')
      expect(config.model).toBe('')
      expect((config.extra as { models: unknown[] }).models).toEqual([])
    })

    it('should throw CLIENT_NOT_DETECTED when models.json does not exist', () => {
      mockExistsSync.mockReturnValue(false)

      try {
        adapter.readConfig()
        expect.fail('Should have thrown')
      } catch (err: unknown) {
        const error = err as { code: ErrorCode; message: string }
        expect(error.code).toBe(ErrorCode.CLIENT_NOT_DETECTED)
      }
    })

    it('should throw CLIENT_CONFIG_READ_FAILED on JSON parse error', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('invalid-json')

      try {
        adapter.readConfig()
        expect.fail('Should have thrown')
      } catch (err: unknown) {
        const error = err as { code: ErrorCode; message: string }
        expect(error.code).toBe(ErrorCode.CLIENT_CONFIG_READ_FAILED)
      }
    })

    it('should include full models array in extra', () => {
      mockExistsSync.mockReturnValue(true)
      const modelsData = [
        { id: 'gpt-4o', url: 'http://localhost:3000/v1', apiKey: 'sk-key' },
      ]
      mockReadFileSync.mockReturnValue(JSON.stringify(modelsData))

      const config = adapter.readConfig()
      expect((config.extra as { models: unknown[] }).models).toEqual(modelsData)
    })

    it('should handle missing url/apiKey/id fields gracefully', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify([{ other: 'data' }]))

      const config = adapter.readConfig()
      expect(config.apiBaseUrl).toBe('')
      expect(config.apiKey).toBe('')
      expect(config.model).toBe('')
    })
  })

  // ──────── writeConfig() ────────

  describe('writeConfig', () => {
    it('should update the first element of the existing array', () => {
      mockExistsSync.mockReturnValue(true)
      const existingModels = [
        { id: 'old-model', name: 'old-model', vendor: 'Custom', url: 'http://old.com/v1', apiKey: 'old-key' },
        { id: 'second-model', name: 'Second', vendor: 'Other', url: 'http://other.com/v1', apiKey: 'other-key' },
      ]
      mockReadFileSync.mockReturnValue(JSON.stringify(existingModels))

      adapter.writeConfig({
        apiBaseUrl: 'http://new.com/v1',
        apiKey: 'sk-new-key',
        model: 'new-model',
        extra: {},
      })

      const writeCall = mockWriteFileSync.mock.calls.find(
        (call: [string, string, string]) => call[0].includes('models.json')
      )
      expect(writeCall).toBeDefined()
      const written = JSON.parse(writeCall![1]) as Array<Record<string, unknown>>

      // First element should be updated
      expect(written[0].url).toBe('http://new.com/v1')
      expect(written[0].apiKey).toBe('sk-new-key')
      expect(written[0].id).toBe('new-model')
      expect(written[0].name).toBe('new-model')

      // Second element should be preserved
      expect(written[1].id).toBe('second-model')
    })

    it('should create a new element when array is empty', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify([]))

      adapter.writeConfig({
        apiBaseUrl: 'http://custom.api.com/v1',
        apiKey: 'sk-brand-new',
        model: 'gpt-5',
        extra: {},
      })

      const writeCall = mockWriteFileSync.mock.calls.find(
        (call: [string, string, string]) => call[0].includes('models.json')
      )
      expect(writeCall).toBeDefined()
      const written = JSON.parse(writeCall![1]) as Array<Record<string, unknown>>

      expect(written).toHaveLength(1)
      expect(written[0].id).toBe('gpt-5')
      expect(written[0].name).toBe('gpt-5')
      expect(written[0].vendor).toBe('Custom')
      expect(written[0].url).toBe('http://custom.api.com/v1')
      expect(written[0].apiKey).toBe('sk-brand-new')
      expect(written[0].supportsToolCall).toBe(true)
      expect(written[0].supportsImages).toBe(true)
      expect(written[0].supportsReasoning).toBe(true)
    })

    it('should create a new element when models.json does not exist', () => {
      // First call for existsSync in writeConfig (file doesn't exist)
      // Second call in backupConfig (also doesn't exist)
      mockExistsSync.mockReturnValue(false)

      adapter.writeConfig({
        apiBaseUrl: 'http://custom.api.com/v1',
        apiKey: 'sk-key',
        model: 'my-model',
        extra: {},
      })

      const writeCall = mockWriteFileSync.mock.calls.find(
        (call: [string, string, string]) => call[0].includes('models.json')
      )
      expect(writeCall).toBeDefined()
      const written = JSON.parse(writeCall![1]) as Array<Record<string, unknown>>
      expect(written).toHaveLength(1)
      expect(written[0].url).toBe('http://custom.api.com/v1')
    })

    it('should only update provided fields when updating first element', () => {
      mockExistsSync.mockReturnValue(true)
      const existing = [
        { id: 'current-model', name: 'current-model', url: 'http://current.com/v1', apiKey: 'current-key' },
      ]
      mockReadFileSync.mockReturnValue(JSON.stringify(existing))

      // Only update apiBaseUrl
      adapter.writeConfig({
        apiBaseUrl: 'http://updated.com/v1',
        apiKey: '',
        model: '',
        extra: {},
      })

      const writeCall = mockWriteFileSync.mock.calls.find(
        (call: [string, string, string]) => call[0].includes('models.json')
      )
      expect(writeCall).toBeDefined()
      const written = JSON.parse(writeCall![1]) as Array<Record<string, unknown>>

      expect(written[0].url).toBe('http://updated.com/v1')
      // apiKey and model should remain unchanged since they were empty strings
      expect(written[0].apiKey).toBe('current-key')
      expect(written[0].id).toBe('current-model')
    })

    it('should throw CLIENT_CONFIG_WRITE_FAILED on write error', () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Disk full')
      })

      // Need to mock backupConfig to not throw — since file doesn't exist, backupConfig will throw
      // Let's make existsSync return true for backup but fail during write
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify([{ id: 'x' }]))
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Disk full')
      })

      try {
        adapter.writeConfig({
          apiBaseUrl: 'http://new.com',
          apiKey: 'key',
          model: 'model',
          extra: {},
        })
        expect.fail('Should have thrown')
      } catch (err: unknown) {
        const error = err as { code: ErrorCode; message: string }
        expect(error.code).toBe(ErrorCode.CLIENT_CONFIG_WRITE_FAILED)
        expect(error.message).toContain('写入 WorkBuddy 配置失败')
      }
    })
  })
})
