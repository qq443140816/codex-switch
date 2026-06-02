import { app, safeStorage } from 'electron'
import { AppError, ErrorCode } from '../../shared/types'

/** API Key 加解密 — 基于 Electron safeStorage（Windows DPAPI） */
export class KeyVault {
  /** 加密明文 API Key，返回 Base64 编码的密文 */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new AppError(ErrorCode.ENCRYPTION_FAILED, '加密内容不能为空')
    }

    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new AppError(ErrorCode.ENCRYPTION_FAILED, '系统加密服务不可用')
      }

      const encryptedBuffer = safeStorage.encryptString(plaintext)
      return encryptedBuffer.toString('base64')
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.ENCRYPTION_FAILED, `加密失败: ${(err as Error).message}`)
    }
  }

  /** 解密 Base64 编码的密文，返回明文 API Key */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      throw new AppError(ErrorCode.DECRYPTION_FAILED, '解密内容不能为空')
    }

    try {
      const encryptedBuffer = Buffer.from(ciphertext, 'base64')
      return safeStorage.decryptString(encryptedBuffer)
    } catch (err) {
      throw new AppError(ErrorCode.DECRYPTION_FAILED, `解密失败: ${(err as Error).message}`)
    }
  }

  /** 判断一个值是否为加密后的密文 */
  isEncrypted(value: string): boolean {
    try {
      const buffer = Buffer.from(value, 'base64')
      // safeStorage 加密后的数据通常以特定标记开头
      // 尝试解密，成功则说明是加密数据
      safeStorage.decryptString(buffer)
      return true
    } catch {
      return false
    }
  }

  /** 脱敏 API Key — 仅显示前后 4 位 */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length <= 8) {
      return '****'
    }
    const prefix = apiKey.substring(0, 4)
    const suffix = apiKey.substring(apiKey.length - 4)
    return `${prefix}****${suffix}`
  }
}
