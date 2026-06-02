import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  TablePagination,
} from '@mui/material'
import type { RequestLog } from '../../../shared/types'

interface LogTableProps {
  logs: RequestLog[]
  totalCount: number
  page: number
  rowsPerPage: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
  onSelectLog: (log: RequestLog) => void
}

/** 日志数据表格 */
export const LogTable: React.FC<LogTableProps> = ({
  logs,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onSelectLog,
}) => {
  const getStatusColor = (statusCode: number): 'success' | 'error' | 'warning' | 'default' => {
    if (statusCode >= 200 && statusCode < 300) return 'success'
    if (statusCode >= 400 && statusCode < 500) return 'warning'
    if (statusCode >= 500) return 'error'
    return 'default'
  }

  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>时间</TableCell>
              <TableCell>渠道</TableCell>
              <TableCell>模型</TableCell>
              <TableCell>方法</TableCell>
              <TableCell>路径</TableCell>
              <TableCell>状态码</TableCell>
              <TableCell>耗时</TableCell>
              <TableCell>Tokens</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    暂无请求日志
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  hover
                  onClick={() => onSelectLog(log)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontSize={12}>
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </Typography>
                  </TableCell>
                  <TableCell>{log.channelName}</TableCell>
                  <TableCell>
                    <Chip label={log.model} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{log.method}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontSize={12} noWrap maxWidth={200}>
                      {log.path}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.statusCode}
                      size="small"
                      color={getStatusColor(log.statusCode)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{log.duration}ms</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontSize={12}>
                      {log.usage
                        ? `${log.usage.totalTokens}`
                        : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="每页行数"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
      />
    </Paper>
  )
}
