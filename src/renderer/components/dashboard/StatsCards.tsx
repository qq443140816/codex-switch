import React from 'react'
import { Grid, Card, CardContent, Typography, Box } from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { useChannels } from '../../hooks/useChannels'
import { useProxy } from '../../hooks/useProxy'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent className="flex items-center gap-3">
      <Box
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
      </Box>
    </CardContent>
  </Card>
)

/** 统计卡片组 */
export const StatsCards: React.FC = () => {
  const { channels } = useChannels()
  const { status } = useProxy()

  const activeChannels = channels.filter((ch) => ch.isActive).length
  const totalChannels = channels.length

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="总渠道数"
          value={totalChannels}
          icon={<SwapHorizIcon />}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="活跃渠道"
          value={activeChannels}
          icon={<CheckCircleIcon />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="代理状态"
          value={status?.status === 'running' ? '运行中' : '已停止'}
          icon={<CheckCircleIcon />}
          color="info"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="监听端口"
          value={status?.port ?? '-'}
          icon={<ErrorIcon />}
          color="warning"
        />
      </Grid>
    </Grid>
  )
}
