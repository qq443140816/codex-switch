import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KeyVault } from '../crypto/key-vault'
import { AppError, ErrorCode } from '../../shared/types'

// Mock Electron safeStorage
const mockEncryptString = vi.fn()
const mockDecryptString = vi.fn()
const mockIsEncryptionAvailable = vi.fn()

vi.mock('electron', () => ({
  app: {},
  safeStorage: {
    encryptString: (...args: unknown[]) => mockEncryptString(...args),
    decryptString: (...args: unknown[]) => mockDecryptString(...args),
    isEncryptionAvailable: () => mockIsEncryptionAvailable(),
  },
}))

describe('KeyVault', () => {
  let keyVault: KeyVault

  beforeEach(() => {
    vi.clearAllMocks()
    keyVault = new KeyVault()
    mockIsEncryptionAvailable.mockReturnValue(true)
  })

  describe('encrypt', () => {
    it('should encrypt plaintext and return Base64 string', () => {
      const plaintext = 'sk-test-api-key-12345'
      const encryptedBuffer = Buffer.from('encrypted-data')
      mockEncryptString.mockReturnValue(encryptedBuffer)

      const result = keyVault.encrypt(plaintext)

      expect(mockEncryptString).toHaveBeenCalledWith(plaintext)
      expect(result).toBe(encryptedBuffer.toString('base64'))
    })

    it('should throw AppError when plaintext is empty', () => {
      expect(() => keyVault.encrypt('')).toThrow()
    })

    it('should throw ENCRYPTION_FAILED error code for empty string', () => {
      try {
        keyVault.encrypt('')
      } catch (err) {
        expect(err).toBeInstanceOf(AppError)
        expect((err as AppError).code).toBe(ErrorCode.ENCRYPTION_FAILED)
      }
    })

    it('should throw AppError when safeStorage is not available', () => {
      mockIsEncryptionAvailable.mockReturnValue(false)

      expect(() => keyVault.encrypt('test-key')).toThrow()
    })

    it('should throw AppError with ENCRYPTION_FAILED code when safeStorage unavailable', () => {
      mockIsEncryptionAvailable.mockReturnValue(false)

      try {
        keyVault.encrypt('test-key')
      } catch (err) {
        expect((err as AppError).code).toBe(ErrorCode.ENCRYPTION_FAILED)
        expect((err as AppError).message).toContain('不可用')
      }
    })
  })

  describe('decrypt', () => {
    it('should decrypt Base64 ciphertext and return plaintext', () => {
      const ciphertext = Buffer.from('encrypted-data').toString('base64')
      const plaintext = 'sk-test-api-key-12345'
      mockDecryptString.mockReturnValue(plaintext)

      const result = keyVault.decrypt(ciphertext)

      expect(mockDecryptString).toHaveBeenCalledWith(Buffer.from(ciphertext, 'base64'))
      expect(result).toBe(plaintext)
    })

    it('should throw AppError when ciphertext is empty', () => {
      expect(() => keyVault.decrypt('')).toThrow()
    })

    it('should throw DECRYPTION_FAILED error code for empty string', () => {
      try {
        keyVault.decrypt('')
      } catch (err) {
        expect(err).toBeInstanceOf(AppError)
        expect((err as AppError).code).toBe(ErrorCode.DECRYPTION_FAILED)
      }
    })

    it('should throw AppError when decryption fails', () => {
      mockDecryptString.mockImplementation(() => {
        throw new Error('Decryption error')
      })

      expect(() => keyVault.decrypt('aW52YWxpZA==')).toThrow()
    })
  })

  describe('isEncrypted', () => {
    it('should return true when decryptString succeeds', () => {
      mockDecryptString.mockReturnValue('decrypted')

      const result = keyVault.isEncrypted('dGVzdA==')

      expect(result).toBe(true)
    })

    it('should return false when decryptString throws', () => {
      mockDecryptString.mockImplementation(() => {
        throw new Error('Not encrypted')
      })

      const result = keyVault.isEncrypted('not-valid-base64-data')

      expect(result).toBe(false)
    })
  })

  describe('maskApiKey', () => {
    it('should mask API key showing first 4 and last 4 characters', () => {
      expect(keyVault.maskApiKey('sk-1234567890abcdef')).toBe('sk-1****cdef')
    })

    it('should return **** for empty string', () => {
      expect(keyVault.maskApiKey('')).toBe('****')
    })

    it('should return **** for keys 8 characters or shorter', () => {
      expect(keyVault.maskApiKey('short')).toBe('****')
      expect(keyVault.maskApiKey('12345678')).toBe('****')
    })

    it('should correctly mask a key with exactly 9 characters', () => {
      // length > 8, so should show first 4 and last 4
      expect(keyVault.maskApiKey('123456789')).toBe('1234****6789')
    })

    it('should handle null/undefined input gracefully', () => {
      expect(keyVault.maskApiKey(null as unknown as string)).toBe('****')
      expect(keyVault.maskApiKey(undefined as unknown as string)).toBe('****')
    })
  })
})
