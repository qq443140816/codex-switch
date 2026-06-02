import { useState, useEffect, useCallback } from 'react'
import type { ClientInfo, ConfigBackup } from '../../shared/types'
import { ipc } from '../utils/ipc'

/** 客户端配置 Hook */
export function useClients() {
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [loading, setLoading] = useState(false)

  /** 刷新客户端列表 */
  const refreshClients = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ipc.client.list()
      setClients(result)
    } catch (err) {
      console.error('获取客户端列表失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /** 切换客户端到指定渠道 */
  const switchChannel = useCallback(async (clientType: string, channelId: string) => {
    return ipc.client.switchChannel(clientType, channelId)
  }, [])

  /** 恢复客户端配置 */
  const restoreBackup = useCallback(async (clientType: string, backupId: string) => {
    return ipc.client.restore(clientType, backupId)
  }, [])

  /** 获取客户端备份列表 */
  const getBackups = useCallback(async (clientType: string): Promise<ConfigBackup[]> => {
    return ipc.client.backups(clientType)
  }, [])

  // 初始化时获取客户端列表
  useEffect(() => {
    refreshClients()
  }, [refreshClients])

  return {
    clients,
    loading,
    switchChannel,
    restoreBackup,
    getBackups,
    refreshClients,
  }
}
