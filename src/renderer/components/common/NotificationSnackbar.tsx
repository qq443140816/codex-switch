import React from 'react'
import { Snackbar, Alert, AlertColor } from '@mui/material'

interface NotificationSnackbarProps {
  open: boolean
  message: string
  severity?: AlertColor
  duration?: number
  onClose: () => void
}

/** 消息提示 */
export const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  open,
  message,
  severity = 'info',
  duration = 4000,
  onClose,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={severity} onClose={onClose} variant="filled">
        {message}
      </Alert>
    </Snackbar>
  )
}
