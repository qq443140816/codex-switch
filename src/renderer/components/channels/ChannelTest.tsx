import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Chip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import type { Channel } from '../../../shared/types'

interface ChannelTestProps {
  channel: Channel | null
  open: boolean
  onClose: () => void
  onTest: (channelId: string) => Promise<{ success: boolean; latency: number; models: string[] }>
}

/** 渠道连通性测试组件 */
export const ChannelTest: React.FC<ChannelTestProps> = ({ channel, open, onClose, onTest }) => {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    latency: number
    models: string[]
  } | null>(null)

  const handleTest = async () => {
    if (!channel) return
    setTesting(true)
    setResult(null)
    try {
      const testResult = await onTest(channel.id)
      setResult(testResult)
    } catch {
      setResult({ success: false, latency: 0, models: [] })
    } finally {
      setTesting(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setTesting(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>连通性测试 — {channel?.name}</DialogTitle>
      <DialogContent>
        <Box className="flex flex-col items-center py-4 gap-4">
          {testing && (
            <>
              <CircularProgress />
              <Typography variant="body1" color="text.secondary">
                正在测试连通性...
              </Typography>
            </>
          )}

          {result && !testing && (
            <>
              {result.success ? (
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />
              )}

              <Typography variant="h6">
                {result.success ? '连接成功' : '连接失败'}
              </Typography>

              {result.success && (
                <Box className="flex flex-col items-center gap-2">
                  <Typography variant="body2" color="text.secondary">
                    延迟: {result.latency}ms
                  </Typography>
                  <Box className="flex flex-wrap gap-1">
                    {result.models.map((model) => (
                      <Chip key={model} label={model} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}

          {!testing && !result && (
            <Typography variant="body1" color="text.secondary">
              点击"开始测试"验证渠道的 Base URL 和 API Key 是否可用
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>关闭</Button>
        <Button
          variant="contained"
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? '测试中...' : '开始测试'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
