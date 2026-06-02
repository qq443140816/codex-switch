import React, { useState, useEffect, useCallback } from 'react'
import { Box, Typography, TextField, Button, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { LogTable } from '../components/logs/LogTable'
import { LogDetail } from '../components/logs/LogDetail'
import { useChannels } from '../hooks/useChannels'
import type { RequestLog, LogFilters } from '../../shared/types'
import { ipc } from '../utils/ipc'

/** 请求日志页面 */
export const Logs: React.FC = () => {
  const { channels } = useChannels()
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filterChannelId, setFilterChannelId] = useState<string>('')

  const fetchLogs = useCallback(async () => {
    try {
      const filters: LogFilters = {
        offset: page * rowsPerPage,
        limit: rowsPerPage,
      }
      if (filterChannelId) {
        filters.channelId = filterChannelId
      }
      const result = await ipc.log.list(filters)
      setLogs(result)
      setTotalCount(result.length)
    } catch (err) {
      console.error('获取日志失败:', err)
    }
  }, [page, rowsPerPage, filterChannelId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleClearLogs = async () => {
    try {
      await ipc.log.clear()
      setLogs([])
      setTotalCount(0)
    } catch (err) {
      console.error('清空日志失败:', err)
    }
  }

  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Typography variant="h4">请求日志</Typography>
        <Button variant="outlined" color="error" onClick={handleClearLogs}>
          清空日志
        </Button>
      </Box>

      {/* 筛选条件 */}
      <Box className="flex gap-4 mb-4">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>按渠道筛选</InputLabel>
          <Select
            value={filterChannelId}
            label="按渠道筛选"
            onChange={(e) => {
              setFilterChannelId(e.target.value)
              setPage(0)
            }}
          >
            <MenuItem value="">全部渠道</MenuItem>
            {channels.map((ch) => (
              <MenuItem key={ch.id} value={ch.id}>
                {ch.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <LogTable
        logs={logs}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(rpp) => {
          setRowsPerPage(rpp)
          setPage(0)
        }}
        onSelectLog={(log) => {
          setSelectedLog(log)
          setDetailOpen(true)
        }}
      />

      <LogDetail
        log={selectedLog}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </Box>
  )
}
