import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { theme } from './theme/theme'
import { AppProvider } from './contexts/AppContext'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Channels } from './pages/Channels'
import { ClientConfig } from './pages/ClientConfig'
import { Logs } from './pages/Logs'
import { Settings } from './pages/Settings'

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="channels" element={<Channels />} />
              <Route path="clients" element={<ClientConfig />} />
              <Route path="logs" element={<Logs />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </ThemeProvider>
  )
}

export default App
