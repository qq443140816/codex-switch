import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { ConfigBackup, AppError, ErrorCode } from '../../shared/types'

/** 配置备份存储 */
export class BackupStore {
  private readonly backupDir: string

  constructor() {
    // 备份目录：%APPDATA%/codex-switch/backups/
    this.backupDir = join(app.getPath('userData'), 'backups')
    this.ensureBackupDir()
  }

  /** 确保备份目录存在 */
  private ensureBackupDir(): void {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }
  }

  /** 创建配置备份 */
  create(clientId: string, content: string, filePath: string): ConfigBackup {
    try {
      // 确保客户端备份目录存在
      const clientBackupDir = join(this.backupDir, clientId)
      if (!existsSync(clientBackupDir)) {
        mkdirSync(clientBackupDir, { recursive: true })
      }

      // 生成时间戳文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `${timestamp}_${this.sanitizeFileName(filePath)}`
      const backupFilePath = join(clientBackupDir, fileName)

      // 写入备份内容
      writeFileSync(backupFilePath, content, 'utf-8')

      const stats = statSync(backupFilePath)

      const backup: ConfigBackup = {
        id: uuidv4(),
        clientId,
        filePath,
        timestamp: new Date().toISOString(),
        size: stats.size,
      }

      // 写入备份元数据
      const metaPath = join(clientBackupDir, `${fileName}.meta.json`)
      writeFileSync(metaPath, JSON.stringify(backup, null, 2), 'utf-8')

      return backup
    } catch (err) {
      throw new AppError(ErrorCode.CLIENT_BACKUP_FAILED, `创建备份失败: ${(err as Error).message}`)
    }
  }

  /** 获取指定客户端的备份列表 */
  list(clientId: string): ConfigBackup[] {
    try {
      const clientBackupDir = join(this.backupDir, clientId)
      if (!existsSync(clientBackupDir)) {
        return []
      }

      const backups: ConfigBackup[] = []
      const files = readdirSync(clientBackupDir)

      for (const file of files) {
        if (file.endsWith('.meta.json')) {
          const metaPath = join(clientBackupDir, file)
          const metaContent = readFileSync(metaPath, 'utf-8')
          const backup = JSON.parse(metaContent) as ConfigBackup
          backups.push(backup)
        }
      }

      // 按时间倒序排列
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      return backups
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `读取备份列表失败: ${(err as Error).message}`)
    }
  }

  /** 获取指定备份记录 */
  get(backupId: string): ConfigBackup | null {
    try {
      // 遍历所有客户端目录查找备份
      if (!existsSync(this.backupDir)) {
        return null
      }

      const clientDirs = readdirSync(this.backupDir)
      for (const clientDir of clientDirs) {
        const clientPath = join(this.backupDir, clientDir)
        if (!statSync(clientPath).isDirectory()) continue

        const files = readdirSync(clientPath)
        for (const file of files) {
          if (file.endsWith('.meta.json')) {
            const metaContent = readFileSync(join(clientPath, file), 'utf-8')
            const backup = JSON.parse(metaContent) as ConfigBackup
            if (backup.id === backupId) {
              return backup
            }
          }
        }
      }

      return null
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `查找备份失败: ${(err as Error).message}`)
    }
  }

  /** 恢复指定备份 */
  restore(backupId: string): void {
    try {
      const backup = this.get(backupId)
      if (!backup) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `备份 ${backupId} 不存在`)
      }

      const content = this.getContent(backupId)
      if (!content) {
        throw new AppError(ErrorCode.STORE_READ_FAILED, `备份内容为空`)
      }

      // 将备份内容写回原配置文件路径
      writeFileSync(backup.filePath, content, 'utf-8')
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.CLIENT_CONFIG_WRITE_FAILED, `恢复备份失败: ${(err as Error).message}`)
    }
  }

  /** 获取备份的文件内容 */
  getContent(backupId: string): string {
    try {
      const backup = this.get(backupId)
      if (!backup) {
        throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `备份 ${backupId} 不存在`)
      }

      // 查找对应的备份文件
      const clientBackupDir = join(this.backupDir, backup.clientId)
      const files = readdirSync(clientBackupDir)

      for (const file of files) {
        if (file.endsWith('.meta.json')) continue
        // 检查 meta 文件中是否匹配
        const metaPath = join(clientBackupDir, `${file}.meta.json`)
        if (existsSync(metaPath)) {
          const metaContent = readFileSync(metaPath, 'utf-8')
          const meta = JSON.parse(metaContent) as ConfigBackup
          if (meta.id === backupId) {
            return readFileSync(join(clientBackupDir, file), 'utf-8')
          }
        }
      }

      throw new AppError(ErrorCode.STORE_READ_FAILED, `未找到备份文件内容`)
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ErrorCode.STORE_READ_FAILED, `读取备份内容失败: ${(err as Error).message}`)
    }
  }

  /** 清理文件名中的特殊字符 */
  private sanitizeFileName(filePath: string): string {
    return filePath.replace(/[\\/:*?"<>|]/g, '_')
  }
}
