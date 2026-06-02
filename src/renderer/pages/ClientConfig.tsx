import React, { useState, useEffect } from 'react'
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import { ClientList } from '../components/clients/ClientList'
import { BackupHistory } from '../components/clients/BackupHistory'
import { NotificationSnackbar } from '../components/common/NotificationSnackbar'
import { useClients } from '../hooks/useClients'
import { useChannels } from '../hooks/useChannels'
import type { ConfigBackup } from '../../shared/types'

/** 客户端配置页面 */
export const ClientConfig: React.FC = () => {
  const { clients, switchChannel, restoreBackup, getBackups, refreshClients } = useClients()
  const { channels } = useChannels()

  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info',
  })

  const [backupDialogOpen, setBackupDialogOpen] = useState(false)
  const [backupClientType, setBackupClientType] = useState<string>('')
  const [backups, setBackups] = useState<ConfigBackup[]>([])

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({ open: true, message, severity })
  }

  const handleSwitch = async (clientType: string, channelId: string) => {
    try {
      const result = await switchChannel(clientType, channelId)
      if (result.success) {
        showNotification('切换成功，已自动创建备份', 'success')
        // 刷新客户端列表，更新 linkedChannelId
        refreshClients()
      } else {
        showNotification('切换失败', 'error')
      }
    } catch (err) {
      showNotification(`切换失败: ${(err as Error).message}`, 'error')
    }
  }

  const handleRestore = async (clientType: string, backupId: string) => {
    try {
      const result = await restoreBackup(clientType, backupId)
      if (result.success) {
        showNotification('配置已恢复', 'success')
        // 刷新客户端列表，更新 linkedChannelId
        refreshClients()
      } else {
        showNotification('恢复失败', 'error')
      }
    } catch (err) {
      showNotification(`恢复失败: ${(err as Error).message}`, 'error')
    }
  }

  const handleViewBackups = async (clientType: string) => {
    try {
      const result = await getBackups(clientType)
      setBackups(result)
      setBackupClientType(clientType)
      setBackupDialogOpen(true)
    } catch (err) {
      showNotification(`获取备份列表失败: ${(err as Error).message}`, 'error')
    }
  }

  return (
    <Box>
      <Typography variant="h4" mb={4}>
        客户端配置
      </Typography>

      <ClientList
        clients={clients}
        onSwitch={handleSwitch}
        onRestore={handleRestore}
        onViewBackups={handleViewBackups}
      />

      {/* 备份历史对话框 */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>备份历史</DialogTitle>
        <DialogContent>
          <BackupHistory
            backups={backups}
            onRestore={(backupId) => handleRestore(backupClientType, backupId)}
            onClose={() => setBackupDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  )
}
