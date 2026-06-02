import React from 'react'
import {
  Drawer,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material'
import type { RequestLog } from '../../../shared/types'

interface LogDetailProps {
  log: RequestLog | null
  open: boolean
  onClose: () => void
}

/** 日志详情抽屉 */
export const LogDetail: React.FC<LogDetailProps> = ({ log, open, onClose }) => {
  const getStatusColor = (statusCode: number): 'success' | 'error' | 'warning' | 'default' => {
    if (statusCode >= 200 && statusCode < 300) return 'success'
    if (statusCode >= 400 && statusCode < 500) return 'warning'
    if (statusCode >= 500) return 'error'
    return 'default'
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 360, p: 3 }}>
        <Typography variant="h6" mb={2}>
          请求详情
        </Typography>

        {log && (
          <>
            <Divider sx={{ mb: 2 }} />

            <List dense>
              <ListItem>
                <ListItemText primary="请求 ID" secondary={log.id} />
              </ListItem>
              <ListItem>
                <ListItemText primary="时间" secondary={new Date(log.timestamp).toLocaleString('zh-CN')} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="渠道"
                  secondary={
                    <Box className="flex items-center gap-2">
                      {log.channelName}
                      <Chip label={log.channelId.substring(0, 8)} size="small" variant="outlined" />
                    </Box>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="模型" secondary={<Chip label={log.model} size="small" />} />
              </ListItem>
              <ListItem>
                <ListItemText primary="方法" secondary={log.method} />
              </ListItem>
              <ListItem>
                <ListItemText primary="路径" secondary={log.path} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="状态码"
                  secondary={
                    <Chip
                      label={log.statusCode}
                      size="small"
                      color={getStatusColor(log.statusCode)}
                      variant="outlined"
                    />
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="耗时" secondary={`${log.duration}ms`} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Token 用量"
                  secondary={
                    log.usage
                      ? `Prompt: ${log.usage.promptTokens} | Completion: ${log.usage.completionTokens} | Total: ${log.usage.totalTokens}`
                      : 'N/A'
                  }
                />
              </ListItem>
            </List>
          </>
        )}
      </Box>
    </Drawer>
  )
}
