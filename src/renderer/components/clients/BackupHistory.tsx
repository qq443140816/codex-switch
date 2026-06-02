import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
} from '@mui/material'
import RestoreIcon from '@mui/icons-material/Restore'
import DeleteIcon from '@mui/icons-material/Delete'
import type { ConfigBackup } from '../../../shared/types'
import { formatDateTime, formatFileSize } from '../../utils/formatters'

interface BackupHistoryProps {
  backups: ConfigBackup[]
  onRestore: (backupId: string) => void
  onClose: () => void
}

/** 备份历史列表 */
export const BackupHistory: React.FC<BackupHistoryProps> = ({ backups, onRestore, onClose }) => {
  return (
    <Card>
      <CardContent>
        <Box className="flex items-center justify-between mb-3">
          <Typography variant="h6">备份历史</Typography>
          <Button size="small" onClick={onClose}>
            关闭
          </Button>
        </Box>

        {backups.length === 0 ? (
          <Box className="flex items-center justify-center py-8">
            <Typography variant="body2" color="text.secondary">
              暂无备份记录
            </Typography>
          </Box>
        ) : (
          <List dense>
            {backups.map((backup) => (
              <ListItem key={backup.id} divider>
                <ListItemText
                  primary={formatDateTime(backup.timestamp)}
                  secondary={`${backup.filePath} · ${formatFileSize(backup.size)}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => onRestore(backup.id)}
                    title="恢复此备份"
                  >
                    <RestoreIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}
