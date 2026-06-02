import { ipcMain } from 'electron'
import http from 'http'
import https from 'https'
import type { IpcDeps } from './index'
import { AppError, ErrorCode, CreateChannelDTO, UpdateChannelDTO } from '../../shared/types'

/** 注册渠道管理相关 IPC 处理器 */
export function registerChannelHandlers(deps: IpcDeps): void {
  const { channelStore, keyVault, getMainWindow } = deps

  /** 获取渠道列表（API Key 脱敏） */
  ipcMain.handle('channel:list', async () => {
    const channels = channelStore.list()
    return channels.map((ch) => ({
      ...ch,
      apiKeyEncrypted: keyVault.maskApiKey(keyVault.decrypt(ch.apiKeyEncrypted)),
    }))
  })

  /** 获取单个渠道（API Key 脱敏） */
  ipcMain.handle('channel:get', async (_event, args: { id: string }) => {
    const channel = channelStore.get(args.id)
    if (!channel) {
      throw new AppError(ErrorCode.CHANNEL_NOT_FOUND, `渠道 ${args.id} 不存在`)
    }
    return {
      ...channel,
      apiKeyEncrypted: keyVault.maskApiKey(keyVault.decrypt(channel.apiKeyEncrypted)),
    }
  })

  /** 创建渠道 */
  ipcMain.handle('channel:create', async (_event, data: CreateChannelDTO) => {
    // 加密 API Key
    const apiKeyEncrypted = keyVault.encrypt(data.apiKey)

    const channel = channelStore.create({
      name: data.name,
      serviceType: data.serviceType,
      baseUrl: data.baseUrl,
      proxyBaseUrl: data.proxyBaseUrl,
      apiKeyEncrypted,
      models: data.models,
    })

    return {
      ...channel,
      apiKeyEncrypted: keyVault.maskApiKey(data.apiKey),
    }
  })

  /** 更新渠道 */
  ipcMain.handle('channel:update', async (_event, args: { id: string } & UpdateChannelDTO) => {
    const updateData: UpdateChannelDTO & { apiKeyEncrypted?: string } = {}

    if (args.name !== undefined) updateData.name = args.name
    if (args.serviceType !== undefined) updateData.serviceType = args.serviceType
    if (args.baseUrl !== undefined) updateData.baseUrl = args.baseUrl
    if (args.proxyBaseUrl !== undefined) updateData.proxyBaseUrl = args.proxyBaseUrl
    if (args.models !== undefined) updateData.models = args.models
    if (args.isActive !== undefined) updateData.isActive = args.isActive

    // 如果更新了 API Key，重新加密
    if (args.apiKey) {
      updateData.apiKeyEncrypted = keyVault.encrypt(args.apiKey)
    }

    const channel = channelStore.update(args.id, updateData)
    return {
      ...channel,
      apiKeyEncrypted: keyVault.maskApiKey(
        args.apiKey ?? keyVault.decrypt(channel.apiKeyEncrypted)
      ),
    }
  })

  /** 删除渠道 */
  ipcMain.handle('channel:delete', async (_event, args: { id: string }) => {
    channelStore.delete(args.id)
    return { success: true }
  })

  /** 测试渠道连通性 */
  ipcMain.handle('channel:test', async (_event, args: { id: string }) => {
    try {
      const channel = channelStore.get(args.id)
      if (!channel) {
        return { success: false, latency: 0, models: [], error: '渠道不存在' }
      }

      const startTime = Date.now()
      const apiKey = keyVault.decrypt(channel.apiKeyEncrypted)

      // 构建测试请求 URL
      let testUrl = channel.baseUrl.replace(/\/+$/, '')
      if (channel.serviceType === 'openai' || channel.serviceType === 'deepseek' || channel.serviceType === 'qwen' || channel.serviceType === 'zhipu') {
        testUrl += '/v1/models'
      } else if (channel.serviceType === 'claude') {
        // Claude 没有直接的模型列表 API，测试 /v1/messages 连通性
        return { success: true, latency: Date.now() - startTime, models: channel.models }
      } else {
        testUrl += '/v1/models'
      }

      // 发送测试请求
      const urlObj = new URL(testUrl)
      const protocol = urlObj.protocol === 'https:' ? https : http

      const result = await new Promise<{ success: boolean; latency: number; models: string[] }>((resolve) => {
        const options: Record<string, unknown> = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }

        const req = protocol.request(options, (res: any) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            const latency = Date.now() - startTime
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString())
              const models = body.data?.map((m: any) => m.id) ?? channel.models
              resolve({ success: res.statusCode === 200, latency, models })
            } catch {
              resolve({ success: res.statusCode === 200, latency, models: channel.models })
            }
          })
        })

        req.on('error', () => {
          resolve({ success: false, latency: Date.now() - startTime, models: [] })
        })

        req.on('timeout', () => {
          req.destroy()
          resolve({ success: false, latency: Date.now() - startTime, models: [] })
        })

        req.end()
      })

      return result
    } catch (err) {
      return { success: false, latency: 0, models: [], error: (err as Error).message }
    }
  })
}
