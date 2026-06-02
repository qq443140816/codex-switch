import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import type { ClientInfo } from '../../../shared/types'
import { useChannels } from '../../hooks/useChannels'

interface ClientCardProps {
  client: ClientInfo
  onSwitch: (clientType: string, channelId: string) => void
  onRestore: (clientType: string, backupId: string) => void
  onViewBackups: (clientType: string) => void
}

/** 单个客户端卡片 */
export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onSwitch,
  onRestore,
  onViewBackups,
}) => {
  const { channels } = useChannels()
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')

  // 判断当前是否已关联到所选渠道
  const isLinkedToSelected = selectedChannelId !== '' && client.linkedChannelId === selectedChannelId

  const handleSwitch = () => {
    if (selectedChannelId && !isLinkedToSelected) {
      onSwitch(client.clientType, selectedChannelId)
    }
  }

  // 获取已关联渠道名称
  const linkedChannel = client.linkedChannelId
    ? channels.find((ch) => ch.id === client.linkedChannelId)
    : null

  return (
    <Card>
      <CardContent>
        <Box className="flex items-center gap-2 mb-2">
          <Typography variant="subtitle1" fontWeight={600}>
            {client.name}
          </Typography>
          <Chip
            icon={client.detected ? <CheckCircleIcon /> : <CancelIcon />}
            label={client.detected ? '已安装' : '未检测到'}
            size="small"
            color={client.detected ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>

        {client.detected && client.currentConfig && (
          <>
            <Typography variant="body2" color="text.secondary">
              API 地址: {client.currentConfig.apiBaseUrl || '未配置'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              模型: {client.currentConfig.model || '未配置'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              API Key: {client.currentConfig.apiKey ? '已配置' : '未配置'}
            </Typography>
            {linkedChannel && (
              <Chip
                label={`当前渠道: ${linkedChannel.name}`}
                size="small"
                color="primary"
                variant="filled"
                sx={{ mt: 1 }}
              />
            )}

            <Divider sx={{ my: 2 }} />

            {/* 切换渠道 */}
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel>选择目标渠道</InputLabel>
              <Select
                value={selectedChannelId}
                label="选择目标渠道"
                onChange={(e) => setSelectedChannelId(e.target.value)}
              >
                <MenuItem value="">
                  <em>选择渠道...</em>
                </MenuItem>
                {channels.map((ch) => (
                  <MenuItem key={ch.id} value={ch.id}>
                    {ch.name} ({ch.serviceType})
                    {client.linkedChannelId === ch.id ? ' ✓' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box className="flex gap-2">
              <Button
                variant="contained"
                size="small"
                onClick={handleSwitch}
                disabled={!selectedChannelId || isLinkedToSelected}
              >
                {isLinkedToSelected ? '已切换到此渠道' : '切换到此渠道'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onViewBackups(client.clientType)}
              >
                查看备份
              </Button>
            </Box>
          </>
        )}

        {!client.detected && (
          <Box className="mt-2">
            <Typography variant="body2" color="text.secondary">
              配置路径:
            </Typography>
            {client.configPaths.map((p) => (
              <Typography key={p} variant="caption" color="text.secondary" display="block">
                {p}
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
