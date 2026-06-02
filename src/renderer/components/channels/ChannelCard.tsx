import React from 'react'
import { Card, CardContent, Typography, Box, Chip, IconButton, Menu, MenuItem } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { Channel } from '../../../shared/types'

interface ChannelCardProps {
  channel: Channel
  onEdit: () => void
  onDelete: () => void
  onTest: () => void
  onSetActive: () => void
}

/** 单个渠道卡片 */
export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onEdit,
  onDelete,
  onTest,
  onSetActive,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  return (
    <Card
      sx={{
        border: channel.isActive ? 2 : 0,
        borderColor: channel.isActive ? 'primary.main' : 'transparent',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 4,
        },
      }}
      onClick={onEdit}
    >
      <CardContent>
        <Box className="flex items-start justify-between">
          <Box className="flex-1">
            <Box className="flex items-center gap-2 mb-1">
              <Typography variant="subtitle1" fontWeight={600}>
                {channel.name}
              </Typography>
              {channel.isActive && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="活跃"
                  size="small"
                  color="primary"
                  variant="filled"
                />
              )}
            </Box>
            <Chip label={channel.serviceType} size="small" variant="outlined" sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {channel.baseUrl}
            </Typography>
            {channel.proxyBaseUrl ? (
              <Typography variant="body2" color="warning.main" noWrap sx={{ fontSize: '0.75rem' }}>
                直连: {channel.proxyBaseUrl}
              </Typography>
            ) : (
              <Typography variant="body2" color="primary" noWrap sx={{ fontSize: '0.75rem' }}>
                🔄 本机代理转发
              </Typography>
            )}
            {channel.models.length > 0 && (
              <Box className="flex flex-wrap gap-1 mt-2">
                {channel.models.slice(0, 3).map((model) => (
                  <Chip key={model} label={model} size="small" variant="outlined" />
                ))}
                {channel.models.length > 3 && (
                  <Chip label={`+${channel.models.length - 3}`} size="small" />
                )}
              </Box>
            )}
          </Box>

          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
        >
          {!channel.isActive && (
            <MenuItem
              onClick={() => {
                onSetActive()
                handleMenuClose()
              }}
            >
              设为活跃
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              onTest()
              handleMenuClose()
            }}
          >
            测试连通性
          </MenuItem>
          <MenuItem
            onClick={() => {
              onEdit()
              handleMenuClose()
            }}
          >
            编辑
          </MenuItem>
          <MenuItem
            onClick={() => {
              onDelete()
              handleMenuClose()
            }}
            sx={{ color: 'error.main' }}
          >
            删除
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  )
}
