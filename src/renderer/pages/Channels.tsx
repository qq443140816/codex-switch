import React, { useState, useCallback, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { ChannelList } from '../components/channels/ChannelList'
import { ChannelForm } from '../components/channels/ChannelForm'
import { ChannelTest } from '../components/channels/ChannelTest'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { NotificationSnackbar } from '../components/common/NotificationSnackbar'
import { useChannels } from '../hooks/useChannels'
import { ipc } from '../utils/ipc'
import type { Channel, CreateChannelDTO, UpdateChannelDTO, AppSettings } from '../../shared/types'

/** 渠道管理页面 */
export const Channels: React.FC = () => {
  const { channels, createChannel, updateChannel, deleteChannel, testChannel, setActiveChannel } = useChannels()

  const [formOpen, setFormOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [testChannel_data, setTestChannelData] = useState<Channel | null>(null)
  const [testOpen, setTestOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null)
  const [proxyPort, setProxyPort] = useState(8080)
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info',
  })

  // 获取当前代理端口设置
  useEffect(() => {
    ipc.settings.get().then((settings: AppSettings) => {
      setProxyPort(settings.proxyPort)
    })
  }, [])

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({ open: true, message, severity })
  }

  const handleAdd = () => {
    setEditingChannel(null)
    setFormOpen(true)
  }

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel)
    setFormOpen(true)
  }

  const handleFormSubmit = async (data: CreateChannelDTO | UpdateChannelDTO) => {
    try {
      if (editingChannel) {
        await updateChannel(editingChannel.id, data as UpdateChannelDTO)
        showNotification('渠道更新成功', 'success')
      } else {
        await createChannel(data as CreateChannelDTO)
        showNotification('渠道创建成功', 'success')
      }
    } catch (err) {
      showNotification(`操作失败: ${(err as Error).message}`, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteChannel(deleteTarget.id)
      showNotification('渠道已删除', 'success')
    } catch (err) {
      showNotification(`删除失败: ${(err as Error).message}`, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleTest = (channel: Channel) => {
    setTestChannelData(channel)
    setTestOpen(true)
  }

  const handleTestExecute = async (channelId: string) => {
    return testChannel(channelId)
  }

  const handleSetActive = async (channelId: string) => {
    try {
      await setActiveChannel(channelId)
      showNotification('已切换活跃渠道', 'success')
    } catch (err) {
      showNotification(`切换失败: ${(err as Error).message}`, 'error')
    }
  }

  return (
    <Box>
      <Typography variant="h4" mb={4}>
        渠道管理
      </Typography>

      <ChannelList
        channels={channels}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(ch) => setDeleteTarget(ch)}
        onTest={handleTest}
        onSetActive={handleSetActive}
      />

      <ChannelForm
        open={formOpen}
        channel={editingChannel}
        proxyPort={proxyPort}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <ChannelTest
        channel={testChannel_data}
        open={testOpen}
        onClose={() => setTestOpen(false)}
        onTest={handleTestExecute}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除渠道"
        message={`确定要删除渠道"${deleteTarget?.name}"吗？此操作不可恢复。`}
        confirmLabel="删除"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  )
}
