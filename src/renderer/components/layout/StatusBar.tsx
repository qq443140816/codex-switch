import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useProxy } from '../../hooks/useProxy'
import { ProxyStatus } from '../../../shared/types'

/** 底部状态栏 */
export const StatusBar: React.FC = () => {
  const { status } = useProxy()

  const isRunning = status?.status === ProxyStatus.RUNNING
  const statusColor = isRunning ? 'success' : status?.status === ProxyStatus.ERROR ? 'error' : 'default'
  const statusText = isRunning ? '代理运行中' : status?.status === ProxyStatus.ERROR ? '代理异常' : '代理已停止'

  return (
    <Box
      className="flex items-center justify-between px-4 h-8"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box className="flex items-center gap-2">
        <Chip
          icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />}
          label={statusText}
          color={statusColor}
          size="small"
          variant="outlined"
        />
        {isRunning && (
          <Typography variant="caption" color="text.secondary">
            localhost:{status?.port ?? 8080}
          </Typography>
        )}
        {status?.activeChannelName && (
          <Typography variant="caption" color="text.secondary">
            当前渠道: {status.activeChannelName}
          </Typography>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary">
        Codex-Switch v1.0.0
      </Typography>
    </Box>
  )
}
