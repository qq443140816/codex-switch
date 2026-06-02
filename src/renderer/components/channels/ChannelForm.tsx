import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  Typography,
  Tooltip,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { ServiceType, CHANNEL_TEMPLATES, getDefaultProxyBaseUrl, getReferenceApiUrl } from '../../../shared/types'
import type { Channel, CreateChannelDTO, UpdateChannelDTO } from '../../../shared/types'

interface ChannelFormProps {
  open: boolean
  channel: Channel | null
  proxyPort: number
  onClose: () => void
  onSubmit: (data: CreateChannelDTO | UpdateChannelDTO) => void
}

/** 渠道编辑对话框 */
export const ChannelForm: React.FC<ChannelFormProps> = ({ open, channel, proxyPort, onClose, onSubmit }) => {
  const [name, setName] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.OPENAI)
  const [baseUrl, setBaseUrl] = useState('')
  const [proxyBaseUrl, setProxyBaseUrl] = useState<string>('')
  const [proxyBaseUrlDirty, setProxyBaseUrlDirty] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [modelInput, setModelInput] = useState('')

  const isEdit = channel !== null

  // 编辑模式下填充已有数据
  useEffect(() => {
    if (channel) {
      setName(channel.name)
      setServiceType(channel.serviceType)
      setBaseUrl(channel.baseUrl)
      setProxyBaseUrl(channel.proxyBaseUrl ?? '')
      setProxyBaseUrlDirty(channel.proxyBaseUrl !== null && channel.proxyBaseUrl !== '')
      setApiKey('') // 不回显 API Key
      setModels(channel.models)
    } else {
      setName('')
      setServiceType(ServiceType.OPENAI)
      setBaseUrl('')
      setProxyBaseUrl('')
      setProxyBaseUrlDirty(false)
      setApiKey('')
      setModels([])
    }
  }, [channel, open])

  /** 选择模板时自动填充 */
  const handleTemplateSelect = (templateName: string) => {
    const template = CHANNEL_TEMPLATES.find((t) => t.name === templateName)
    if (template) {
      setName(template.name)
      setServiceType(template.serviceType)
      setBaseUrl(template.baseUrl)
      setProxyBaseUrl('')
      setProxyBaseUrlDirty(false)
      setModels([...template.defaultModels])
    }
  }

  const handleSubmit = () => {
    // 空字符串 → null（表示走本机代理）
    const resolvedProxyBaseUrl = proxyBaseUrl.trim() || null

    if (isEdit) {
      const updateData: UpdateChannelDTO = {
        name,
        serviceType,
        baseUrl,
        proxyBaseUrl: resolvedProxyBaseUrl,
        models,
      }
      if (apiKey) {
        updateData.apiKey = apiKey
      }
      onSubmit(updateData)
    } else {
      const createData: CreateChannelDTO = {
        name,
        serviceType,
        baseUrl,
        proxyBaseUrl: resolvedProxyBaseUrl ?? undefined,
        apiKey,
        models,
      }
      onSubmit(createData)
    }
    onClose()
  }

  const handleAddModel = () => {
    const trimmed = modelInput.trim()
    if (trimmed && !models.includes(trimmed)) {
      setModels([...models, trimmed])
      setModelInput('')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? '编辑渠道' : '添加渠道'}</DialogTitle>
      <DialogContent>
        <Box className="flex flex-col gap-3 pt-2">
          {/* 快速模板选择 */}
          {!isEdit && (
            <FormControl fullWidth size="small">
              <InputLabel>从模板创建</InputLabel>
              <Select
                value=""
                label="从模板创建"
                onChange={(e) => handleTemplateSelect(e.target.value)}
              >
                {CHANNEL_TEMPLATES.map((t) => (
                  <MenuItem key={t.serviceType} value={t.name}>
                    {t.name} ({t.serviceType})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="渠道名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            required
          />

          <FormControl fullWidth size="small">
            <InputLabel>服务类型</InputLabel>
            <Select
              value={serviceType}
              label="服务类型"
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
            >
              <MenuItem value={ServiceType.OPENAI}>OpenAI</MenuItem>
              <MenuItem value={ServiceType.CLAUDE}>Claude</MenuItem>
              <MenuItem value={ServiceType.DEEPSEEK}>DeepSeek</MenuItem>
              <MenuItem value={ServiceType.GEMINI}>Gemini</MenuItem>
              <MenuItem value={ServiceType.QWEN}>通义千问</MenuItem>
              <MenuItem value={ServiceType.ZHIPU}>智谱</MenuItem>
              <MenuItem value={ServiceType.CUSTOM}>自定义</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="上游 API 地址 (Base URL)"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            fullWidth
            size="small"
            placeholder="https://api.openai.com"
            helperText="服务商的真实 API 地址，代理转发时使用"
            required
          />

          <Box>
            <Box className="flex items-center gap-1">
              <TextField
                label="代理 API 地址"
                value={proxyBaseUrl}
                onChange={(e) => {
                  setProxyBaseUrl(e.target.value)
                  setProxyBaseUrlDirty(e.target.value.trim() !== '')
                }}
                fullWidth
                size="small"
                placeholder={getDefaultProxyBaseUrl(proxyPort)}
              />
              <Tooltip title={
                proxyBaseUrl.trim()
                  ? '填写后将直接使用此地址写入客户端配置，不经过本机代理转发'
                  : '留空则使用本机代理转发（客户端请求 → 本机代理 → 上游API）'
              }>
                <InfoOutlinedIcon color={proxyBaseUrl.trim() ? 'warning' : 'action'} fontSize="small" sx={{ mt: 1 }} />
              </Tooltip>
            </Box>
            <Typography variant="caption" color={proxyBaseUrl.trim() ? 'warning.main' : 'text.secondary'} sx={{ mt: 0.5, display: 'block' }}>
              {proxyBaseUrl.trim()
                ? '⚠️ 直连模式：客户端将直接连接此地址，不经过本机代理转发'
                : `🔄 代理模式：留空则通过本机代理 ${getDefaultProxyBaseUrl(proxyPort)} 转发请求`
              }
            </Typography>
            {getReferenceApiUrl(serviceType) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                参考：{getReferenceApiUrl(serviceType)}
              </Typography>
            )}
          </Box>

          <TextField
            label="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            size="small"
            type="password"
            placeholder={isEdit ? '留空则不修改' : '输入 API Key'}
            required={!isEdit}
          />

          {/* 模型列表 */}
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              模型列表
            </Typography>
            <Box className="flex gap-2 mb-2">
              <TextField
                size="small"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="输入模型名称"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddModel()
                  }
                }}
              />
              <Button variant="outlined" size="small" onClick={handleAddModel}>
                添加
              </Button>
            </Box>
            <Box className="flex flex-wrap gap-1">
              {models.map((model) => (
                <Chip
                  key={model}
                  label={model}
                  size="small"
                  onDelete={() => setModels(models.filter((m) => m !== model))}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name || !baseUrl || (!isEdit && !apiKey)}
        >
          {isEdit ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
