import { useState, useEffect, useCallback } from 'react'
import { ProxyStatus, ProxyStatusInfo } from '../../shared/types'
import { ipc } from '../utils/ipc'

/** 代理状态 Hook */
export function useProxy() {
  const [status, setStatus] = useState<ProxyStatusInfo | null>(null)
  const [loading, setLoading] = useState(false)

  /** 刷新代理状态 */
  const refreshStatus = useCallback(async () => {
    try {
      const result = await ipc.proxy.status()
      setStatus(result)
    } catch (err) {
      console.error('获取代理状态失败:', err)
    }
  }, [])

  /** 启动代理 */
  const start = useCallback(async (port: number) => {
    setLoading(true)
    try {
      const result = await ipc.proxy.start(port)
      if (result.success) {
        await refreshStatus()
      }
      return result
    } catch (err) {
      console.error('启动代理失败:', err)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [refreshStatus])

  /** 停止代理 */
  const stop = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ipc.proxy.stop()
      if (result.success) {
        await refreshStatus()
      }
      return result
    } catch (err) {
      console.error('停止代理失败:', err)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [refreshStatus])

  /** 设置活跃渠道 */
  const setActiveChannel = useCallback(async (channelId: string) => {
    try {
      const result = await ipc.proxy.setChannel(channelId)
      if (result.success) {
        await refreshStatus()
      }
      return result
    } catch (err) {
      console.error('设置活跃渠道失败:', err)
      return { success: false }
    }
  }, [refreshStatus])

  // 初始化时获取状态
  useEffect(() => {
    refreshStatus()

    // 监听代理状态变更事件
    const unsubscribe = ipc.on('proxy:status-changed', (data: unknown) => {
      setStatus(data as ProxyStatusInfo)
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [refreshStatus])

  return {
    status,
    loading,
    start,
    stop,
    setActiveChannel,
    refreshStatus,
  }
}
