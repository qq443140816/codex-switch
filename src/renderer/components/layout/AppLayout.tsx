import React from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'

/** 应用主布局 — 侧边栏 + 内容区 + 状态栏 */
export const AppLayout: React.FC = () => {
  return (
    <Box className="flex h-screen" sx={{ bgcolor: 'background.default' }}>
      {/* 左侧导航栏 */}
      <Sidebar />

      {/* 右侧内容区 */}
      <Box className="flex flex-col flex-1 overflow-hidden">
        {/* 页面内容 */}
        <Box className="flex-1 overflow-auto p-6">
          <Outlet />
        </Box>

        {/* 底部状态栏 */}
        <StatusBar />
      </Box>
    </Box>
  )
}
