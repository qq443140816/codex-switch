import React from 'react'
import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import { ProxyStatus as ProxyStatusEnum } from '../../../shared/types'
import { useProxy } from '../../hooks/useProxy'

/** 代理状态卡片 */
export const ProxyStatusCard: React.FC = () => {
  const { status, start, stop } = useProxy()

  const isRunning = status?.status === ProxyStatusEnum.RUNNING
  const isError = status?.status === ProxyStatusEnum.ERROR

  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <Box className="flex items-center gap-3">
          <Box
            className="w-12 h-12 rounded-full flex items-center justify-center"
            sx={{
              bgcolor: isRunning ? 'success.light' : isError ? 'error.light' : 'grey.300',
            }}
          >
            <Box
              className="w-4 h-4 rounded-full"
              sx={{
                bgcolor: isRunning ? 'success.dark' : isError ? 'error.dark' : 'grey.500',
              }}
            />
          </Box>
          <Box>
            <Typography variant="h6">
              {isRunning ? '代理运行中' : isError ? '代理异常' : '代理已停止'}
            </Typography>
            <Box className="flex items-center gap-2 mt-1">
              {isRunning && (
                <Chip label={`端口: ${status?.port ?? 8080}`} size="small" color="primary" variant="outlined" />
              )}
              {status?.activeChannelName && (
                <Typography variant="body2" color="text.secondary">
                  活跃渠道: {status.activeChannelName}
                </Typography>
              )}
              {isError && status?.errorMessage && (
                <Typography variant="body2" color="error">
                  {status.errorMessage}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Box className="flex gap-2">
          {!isRunning && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={() => start(status?.port ?? 8080)}
            >
              启动代理
            </Button>
          )}
          {isRunning && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={stop}
            >
              停止代理
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
