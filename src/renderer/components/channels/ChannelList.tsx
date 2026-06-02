import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { ChannelCard } from './ChannelCard'
import type { Channel } from '../../../shared/types'

interface ChannelListProps {
  channels: Channel[]
  onAdd: () => void
  onEdit: (channel: Channel) => void
  onDelete: (channel: Channel) => void
  onTest: (channel: Channel) => void
  onSetActive: (channelId: string) => void
}

/** 渠道卡片列表 */
export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  onAdd,
  onEdit,
  onDelete,
  onTest,
  onSetActive,
}) => {
  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Typography variant="h6">渠道列表</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          添加渠道
        </Button>
      </Box>

      {channels.length === 0 ? (
        <Box className="flex flex-col items-center justify-center py-12">
          <Typography variant="body1" color="text.secondary" gutterBottom>
            暂无渠道配置
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            点击"添加渠道"开始配置模型服务
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd}>
            添加第一个渠道
          </Button>
        </Box>
      ) : (
        <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onEdit={() => onEdit(channel)}
              onDelete={() => onDelete(channel)}
              onTest={() => onTest(channel)}
              onSetActive={() => onSetActive(channel.id)}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
