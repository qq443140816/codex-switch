import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent'
import DescriptionIcon from '@mui/icons-material/Description'
import SettingsIcon from '@mui/icons-material/Settings'

const DRAWER_WIDTH = 220

const NAV_ITEMS = [
  { label: '仪表盘', icon: <DashboardIcon />, path: '/' },
  { label: '渠道管理', icon: <SwapHorizIcon />, path: '/channels' },
  { label: '客户端配置', icon: <SettingsInputComponentIcon />, path: '/clients' },
  { label: '请求日志', icon: <DescriptionIcon />, path: '/logs' },
  { label: '设置', icon: <SettingsIcon />, path: '/settings' },
]

/** 左侧导航栏 */
export const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {/* 应用标题 */}
      <Box className="flex items-center h-16 px-4" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <SettingsInputComponentIcon sx={{ color: 'primary.main', mr: 1 }} />
        <Typography variant="h6" color="primary.main" fontWeight={700}>
          Codex-Switch
        </Typography>
      </Box>

      {/* 导航列表 */}
      <List className="pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider />

      {/* 底部版本信息 */}
      <Box className="flex-1" />
      <Box className="px-4 py-3">
        <Typography variant="caption" color="text.secondary">
          v1.0.0
        </Typography>
      </Box>
    </Drawer>
  )
}
