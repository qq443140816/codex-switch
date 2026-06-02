import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { ProxyStatusInfo } from '../../shared/types'
import { useProxy } from '../hooks/useProxy'

/** 通知类型 */
interface Notification {
  id: string
  message: string
  severity: 'success' | 'error' | 'info' | 'warning'
}

/** 全局应用状态 */
interface AppState {
  notifications: Notification[]
  addNotification: (message: string, severity?: Notification['severity']) => void
  removeNotification: (id: string) => void
  proxyStatus: ProxyStatusInfo | null
  refreshProxyStatus: () => void
}

const AppContext = createContext<AppState | null>(null)

/** 全局状态 Provider */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { status, refreshStatus } = useProxy()

  const addNotification = useCallback((message: string, severity: Notification['severity'] = 'info') => {
    const id = Date.now().toString()
    setNotifications((prev) => [...prev, { id, message, severity }])

    // 自动移除（4秒后）
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 4000)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const value: AppState = {
    notifications,
    addNotification,
    removeNotification,
    proxyStatus: status,
    refreshProxyStatus: refreshStatus,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/** 使用全局状态的 Hook */
export function useAppContext(): AppState {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
