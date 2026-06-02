import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  MenuItem,
  Paper,
  Divider,
  Alert,
} from '@mui/material'
import { useSettings } from '../hooks/useSettings'
import type { AppSettings } from '../../shared/types'

/** 应用设置页面 */
export const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings()
  const [form, setForm] = useState<AppSettings>({
    proxyPort: 8080,
    autoStartProxy: true,
    autoLaunch: false,
    language: 'zh-CN',
    dataPath: '',
    loggingEnabled: true,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm(settings)
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('保存设置失败:', err)
    }
  }

  const handleChange = (field: keyof AppSettings, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Box>
      <Typography variant="h4" mb={4}>
        设置
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          代理服务
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box className="flex flex-col gap-3">
          <TextField
            label="代理端口"
            type="number"
            value={form.proxyPort}
            onChange={(e) => handleChange('proxyPort', parseInt(e.target.value, 10))}
            size="small"
            sx={{ maxWidth: 300 }}
            inputProps={{ min: 1024, max: 65535 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.autoStartProxy}
                onChange={(e) => handleChange('autoStartProxy', e.target.checked)}
              />
            }
            label="应用启动时自动开启代理"
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.loggingEnabled}
                onChange={(e) => handleChange('loggingEnabled', e.target.checked)}
              />
            }
            label="记录请求日志"
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          系统设置
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box className="flex flex-col gap-3">
          <FormControlLabel
            control={
              <Switch
                checked={form.autoLaunch}
                onChange={(e) => handleChange('autoLaunch', e.target.checked)}
              />
            }
            label="开机自启动"
          />

          <TextField
            label="界面语言"
            value={form.language}
            onChange={(e) => handleChange('language', e.target.value)}
            size="small"
            sx={{ maxWidth: 300 }}
            select
          >
            <MenuItem value="zh-CN">简体中文</MenuItem>
            <MenuItem value="en-US">English</MenuItem>
          </TextField>

          <TextField
            label="数据存储路径"
            value={form.dataPath}
            onChange={(e) => handleChange('dataPath', e.target.value)}
            size="small"
            sx={{ maxWidth: 500 }}
            placeholder="默认路径：%APPDATA%/codex-switch"
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          关于
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Codex-Switch v1.0.0
        </Typography>
        <Typography variant="body2" color="text.secondary">
          一体化 AI 模型代理与客户端配置管理工具
        </Typography>
      </Paper>

      <Box className="flex items-center gap-3">
        <Button variant="contained" onClick={handleSave}>
          保存设置
        </Button>
        {saved && (
          <Alert severity="success" sx={{ py: 0 }}>
            设置已保存
          </Alert>
        )}
      </Box>
    </Box>
  )
}
