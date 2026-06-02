import Store from 'electron-store'
import { AppSettings, DEFAULT_SETTINGS, AppError, ErrorCode } from '../../shared/types'

/** 应用设置存储 */
export class SettingsStore {
  private readonly store: Store<{ settings: AppSettings }>

  constructor() {
    this.store = new Store<{ settings: AppSettings }>({
      name: 'config',
      defaults: {
        settings: DEFAULT_SETTINGS,
      },
    })
  }

  /** 获取应用设置 */
  get(): AppSettings {
    try {
      return this.store.get('settings', DEFAULT_SETTINGS)
    } catch (err) {
      throw new AppError(ErrorCode.STORE_READ_FAILED, `读取设置失败: ${(err as Error).message}`)
    }
  }

  /** 更新应用设置（部分更新） */
  update(partial: Partial<AppSettings>): AppSettings {
    try {
      const current = this.get()
      const updated: AppSettings = {
        ...current,
        ...partial,
      }
      this.store.set('settings', updated)
      return updated
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `更新设置失败: ${(err as Error).message}`)
    }
  }

  /** 重置为默认设置 */
  reset(): AppSettings {
    try {
      this.store.set('settings', DEFAULT_SETTINGS)
      return DEFAULT_SETTINGS
    } catch (err) {
      throw new AppError(ErrorCode.STORE_WRITE_FAILED, `重置设置失败: ${(err as Error).message}`)
    }
  }
}
