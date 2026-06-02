import React from 'react'
import { Box, Typography } from '@mui/material'
import { ProxyStatusCard } from '../components/dashboard/ProxyStatus'
import { StatsCards } from '../components/dashboard/StatsCards'
import { RecentLogs } from '../components/dashboard/RecentLogs'

/** 仪表盘页面 */
export const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" mb={4}>
        仪表盘
      </Typography>

      {/* 代理状态 */}
      <Box mb={3}>
        <ProxyStatusCard />
      </Box>

      {/* 统计卡片 */}
      <Box mb={3}>
        <StatsCards />
      </Box>

      {/* 最近日志 */}
      <RecentLogs />
    </Box>
  )
}
