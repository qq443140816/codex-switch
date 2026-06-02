import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { ClientCard } from './ClientCard'
import type { ClientInfo } from '../../../shared/types'

interface ClientListProps {
  clients: ClientInfo[]
  onSwitch: (clientType: string, channelId: string) => void
  onRestore: (clientType: string, backupId: string) => void
  onViewBackups: (clientType: string) => void
}

/** 客户端列表 */
export const ClientList: React.FC<ClientListProps> = ({
  clients,
  onSwitch,
  onRestore,
  onViewBackups,
}) => {
  return (
    <Box>
      <Typography variant="h6" mb={3}>
        已检测客户端
      </Typography>

      {clients.length === 0 ? (
        <Box className="flex flex-col items-center justify-center py-12">
          <Typography variant="body1" color="text.secondary">
            未检测到已安装的 AI 客户端
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            请确保已安装 Codex、WorkBuddy 等客户端
          </Typography>
        </Box>
      ) : (
        <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((client) => (
            <ClientCard
              key={client.clientType}
              client={client}
              onSwitch={onSwitch}
              onRestore={onRestore}
              onViewBackups={onViewBackups}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
