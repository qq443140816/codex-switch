import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { RequestLog } from '../../../shared/types'

/** 最近日志预览 */
export const RecentLogs: React.FC = () => {
  const [recentLogs, setRecentLogs] = useState<RequestLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const logs = await window.api.log.list({ offset: 0, limit: 1000 })
      setRecentLogs(logs)
    } catch (err) {
      console.error('获取日志失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  /** 格式化时间戳（日期 + 时间） */
  const formatTime = (timestamp: string): string => {
    try {
      const d = new Date(timestamp)
      const y = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const m = String(d.getMinutes()).padStart(2, '0')
      const s = String(d.getSeconds()).padStart(2, '0')
      return `${y}-${mo}-${day} ${h}:${m}:${s}`
    } catch {
      return timestamp
    }
  }

  return (
    <Card>
      <CardContent>
        <Box className="flex items-center gap-2 mb-3">
          <AccessTimeIcon color="action" fontSize="small" />
          <Typography variant="h6">最近请求</Typography>
          {!loading && recentLogs.length > 0 && (
            <Chip label={`${recentLogs.length} / 1000`} size="small" variant="outlined" />
          )}
          <Box flex={1} />
          <Tooltip title="刷新">
            <IconButton size="small" onClick={fetchLogs} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {loading ? (
          <Box className="flex items-center justify-center h-24">
            <CircularProgress size={24} />
          </Box>
        ) : recentLogs.length === 0 ? (
          <Box className="flex items-center justify-center h-24">
            <Typography variant="body2" color="text.secondary">
              暂无请求日志
            </Typography>
          </Box>
        ) : (
          <List dense>
            {recentLogs.map((log) => (
              <ListItem key={log.id} divider>
                <ListItemText
                  primary={
                    <Box className="flex items-center gap-2">
                      <Typography variant="body2">{log.channelName}</Typography>
                      <Chip label={log.model} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <Box className="flex items-center gap-2">
                      <Typography
                        variant="caption"
                        sx={{
                          color: log.statusCode >= 400 ? 'error.main' : 'success.main',
                          fontWeight: 600,
                        }}
                      >
                        {log.statusCode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {log.duration}ms
                      </Typography>
                      {log.usage && (
                        <Typography variant="caption" color="text.secondary">
                          {log.usage.totalTokens} tokens
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {log.method} {log.path}
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  {formatTime(log.timestamp)}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}
