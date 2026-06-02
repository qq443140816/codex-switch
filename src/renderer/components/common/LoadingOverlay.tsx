import React from 'react'
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material'

interface LoadingOverlayProps {
  open: boolean
  message?: string
}

/** 加载遮罩 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ open, message }) => {
  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={open}
    >
      <Box className="flex flex-col items-center gap-2">
        <CircularProgress color="inherit" />
        {message && (
          <Typography variant="body1">{message}</Typography>
        )}
      </Box>
    </Backdrop>
  )
}
