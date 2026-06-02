import { useState, useEffect, useCallback } from 'react'
import type { Channel, CreateChannelDTO, UpdateChannelDTO, ChannelTestResult } from '../../shared/types'
import { ipc } from '../utils/ipc'

/** 渠道数据 Hook */
export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)

  /** 刷新渠道列表 */
  const refreshChannels = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ipc.channel.list()
      setChannels(result)
    } catch (err) {
      console.error('获取渠道列表失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /** 创建渠道 */
  const createChannel = useCallback(async (data: CreateChannelDTO): Promise<Channel> => {
    const result = await ipc.channel.create(data)
    await refreshChannels()
    return result
  }, [refreshChannels])

  /** 更新渠道 */
  const updateChannel = useCallback(async (id: string, data: UpdateChannelDTO): Promise<Channel> => {
    const result = await ipc.channel.update(id, data)
    await refreshChannels()
    return result
  }, [refreshChannels])

  /** 删除渠道 */
  const deleteChannel = useCallback(async (id: string): Promise<void> => {
    await ipc.channel.delete(id)
    await refreshChannels()
  }, [refreshChannels])

  /** 测试渠道连通性 */
  const testChannel = useCallback(async (id: string): Promise<ChannelTestResult> => {
    return ipc.channel.test(id)
  }, [])

  /** 设置活跃渠道 */
  const setActiveChannel = useCallback(async (id: string): Promise<void> => {
    await ipc.proxy.setChannel(id)
    await refreshChannels()
  }, [refreshChannels])

  // 初始化时获取渠道列表
  useEffect(() => {
    refreshChannels()
  }, [refreshChannels])

  return {
    channels,
    loading,
    createChannel,
    updateChannel,
    deleteChannel,
    testChannel,
    setActiveChannel,
    refreshChannels,
  }
}
