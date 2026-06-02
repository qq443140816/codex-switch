import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { ipc } from '../utils/ipc'

/** 设置 Hook */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)

  /** 刷新设置 */
  const refreshSettings = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ipc.settings.get()
      setSettings(result)
    } catch (err) {
      console.error('获取设置失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /** 更新设置 */
  const updateSettings = useCallback(async (partial: Partial<AppSettings>): Promise<AppSettings> => {
    const result = await ipc.settings.update(partial)
    setSettings(result)
    return result
  }, [])

  // 初始化时获取设置
  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings,
  }
}
