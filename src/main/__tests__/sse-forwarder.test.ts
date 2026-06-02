import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import http from 'http'
import { SSEForwarder } from '../proxy/sse-forwarder'
import { ServiceType } from '../../shared/types'
import type { Channel } from '../../shared/types'
import type { IProtocolConverter } from '../converter/base'

// ── Helper: create mock objects ──
function createMockRequest(overrides: Record<string, unknown> = {}): any {
  return {
    method: 'POST',
    url: '/v1/chat/completions',
    headers: {},
    ...overrides,
  }
}

function createMockResponse(): any {
  let headersSent = false
  return {
    writeHead: vi.fn((statusCode: number, headers?: Record<string, string>) => {
      headersSent = true
    }),
    write: vi.fn(),
    end: vi.fn(),
    get headersSent() {
      return headersSent
    },
  }
}

function createMockChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 'channel-1',
    name: 'Test Channel',
    serviceType: ServiceType.OPENAI,
    baseUrl: 'https://api.openai.com',
    apiKeyEncrypted: 'encrypted-key-base64',
    models: ['gpt-4o'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createMockConverter(): IProtocolConverter {
  return {
    serviceType: ServiceType.OPENAI,
    supportsStreamingConversion: false,
    convertRequest: vi.fn().mockReturnValue({ model: 'gpt-4o', messages: [] }),
    convertResponse: vi.fn(),
  } as unknown as IProtocolConverter
}

describe('SSEForwarder', () => {
  let forwarder: SSEForwarder
  let mockKeyVault: { decrypt: ReturnType<typeof vi.fn> }
  let mockLogStore: { add: ReturnType<typeof vi.fn> }
  let upstreamServer: http.Server
  let upstreamPort: number

  beforeEach(async () => {
    vi.clearAllMocks()

    mockKeyVault = { decrypt: vi.fn().mockReturnValue('sk-decrypted-key') }
    mockLogStore = { add: vi.fn() }
    const mockSettingsStore = { get: vi.fn().mockReturnValue({ loggingEnabled: true }) }

    forwarder = new SSEForwarder(
      mockLogStore as any,
      mockKeyVault as any,
      mockSettingsStore as any
    )

    // Start a real upstream HTTP server for integration-style testing
    upstreamServer = http.createServer()
    await new Promise<void>((resolve) => {
      upstreamServer.listen(0, '127.0.0.1', () => {
        upstreamPort = (upstreamServer.address() as any).port
        resolve()
      })
    })
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      upstreamServer.close(() => resolve())
    })
  })

  // ──────── SSE Response Headers ────────

  describe('SSE response headers', () => {
    it('should set correct SSE headers on the response', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel()
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      upstreamServer.on('request', (upReq, upRes) => {
        upRes.writeHead(200, { 'Content-Type': 'text/event-stream' })
        upRes.end('data: {}\n\n')
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
        Date.now()
      )

      expect(res.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      })
    })
  })

  // ──────── Stream Chunk Pass-through ────────

  describe('stream chunk pass-through', () => {
    it('should write upstream SSE chunks directly to client response', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel()
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      upstreamServer.on('request', (upReq, upRes) => {
        upRes.writeHead(200, { 'Content-Type': 'text/event-stream' })
        upRes.write('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n')
        upRes.write('data: {"choices":[{"delta":{"content":" World"}}]}\n\n')
        upRes.end()
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
        Date.now()
      )

      expect(res.write).toHaveBeenCalledTimes(2)
    })
  })

  // ──────── Upstream Error Handling ────────

  describe('upstream error handling', () => {
    it('should handle upstream HTTP error (429)', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel()
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      upstreamServer.on('request', (upReq, upRes) => {
        upRes.writeHead(429, { 'Content-Type': 'application/json' })
        upRes.end('{"error":"rate limited"}')
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
        Date.now()
      )

      expect(res.end).toHaveBeenCalled()
      expect(mockLogStore.add).toHaveBeenCalledTimes(1)
      expect(mockLogStore.add.mock.calls[0][0].statusCode).toBe(429)
    })

    it('should handle upstream connection error (network failure)', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel()
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      // Target a port that doesn't exist / refuses connection
      await forwarder.forward(
        req, res, channel, body, converter,
        'http://127.0.0.1:1/v1/chat/completions',
        Date.now()
      )

      expect(res.end).toHaveBeenCalled()
      expect(mockLogStore.add).toHaveBeenCalledTimes(1)
      expect(mockLogStore.add.mock.calls[0][0].statusCode).toBe(502)
    })

    it('should handle upstream response error event', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel()
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      // Close the server immediately after sending headers to simulate broken stream
      upstreamServer.on('request', (upReq, upRes) => {
        upRes.writeHead(200, { 'Content-Type': 'text/event-stream' })
        upRes.write('partial data')
        // Forcefully destroy the socket
        upReq.socket.destroy()
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
        Date.now()
      )

      // The connection should be terminated; response should end
      expect(res.end).toHaveBeenCalled()
    })
  })

  // ──────── Log Recording ────────

  describe('log recording', () => {
    it('should call converter.convertRequest with the request body', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel()
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      upstreamServer.on('request', (upReq, upRes) => {
        upRes.writeHead(200, { 'Content-Type': 'text/event-stream' })
        upRes.end('data: {}\n\n')
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
        Date.now()
      )

      expect(converter.convertRequest).toHaveBeenCalledWith(body)
    })

    it('should call keyVault.decrypt with channel.apiKeyEncrypted', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel({ apiKeyEncrypted: 'my-encrypted-key' })
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      upstreamServer.on('request', (upReq, upRes) => {
        upRes.writeHead(200, { 'Content-Type': 'text/event-stream' })
        upRes.end('data: {}\n\n')
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
        Date.now()
      )

      expect(mockKeyVault.decrypt).toHaveBeenCalledWith('my-encrypted-key')
    })

    it('should record a log entry on successful forward', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel({ id: 'ch-1', name: 'My Channel' })
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }
      const startTime = Date.now() - 100

      upstreamServer.on('request', (upReq, upRes) => {
        upRes.writeHead(200, { 'Content-Type': 'text/event-stream' })
        upRes.end('data: {}\n\n')
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
        startTime
      )

      expect(mockLogStore.add).toHaveBeenCalledTimes(1)
      const logEntry = mockLogStore.add.mock.calls[0][0]
      expect(logEntry.channelId).toBe('ch-1')
      expect(logEntry.channelName).toBe('My Channel')
      expect(logEntry.model).toBe('gpt-4o')
      expect(logEntry.statusCode).toBe(200)
    })

    it('should record a log entry with status 502 on upstream connection error', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel()
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      await forwarder.forward(
        req, res, channel, body, converter,
        'http://127.0.0.1:1/v1/chat/completions',
        Date.now()
      )

      expect(mockLogStore.add).toHaveBeenCalledTimes(1)
      expect(mockLogStore.add.mock.calls[0][0].statusCode).toBe(502)
    })
  })

  // ──────── Auth Headers ────────

  describe('auth headers', () => {
    it('should use Bearer token for OpenAI channels', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel({ serviceType: ServiceType.OPENAI })
      const converter = createMockConverter()
      const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], stream: true }

      let capturedHeaders: Record<string, string> = {}

      upstreamServer.on('request', (upReq, upRes) => {
        capturedHeaders = upReq.headers as Record<string, string>
        upRes.writeHead(200, { 'Content-Type': 'text/event-stream' })
        upRes.end('data: {}\n\n')
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
        Date.now()
      )

      expect(capturedHeaders['authorization']).toBe('Bearer sk-decrypted-key')
    })

    it('should use x-api-key for Claude channels', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const channel = createMockChannel({ serviceType: ServiceType.CLAUDE })
      const converter = createMockConverter()
      const body = { model: 'claude-3', messages: [{ role: 'user', content: 'hello' }], stream: true }

      let capturedHeaders: Record<string, string> = {}

      upstreamServer.on('request', (upReq, upRes) => {
        capturedHeaders = upReq.headers as Record<string, string>
        upRes.writeHead(200, { 'Content-Type': 'text/event-stream' })
        upRes.end('data: {}\n\n')
      })

      await forwarder.forward(
        req, res, channel, body, converter,
        `http://127.0.0.1:${upstreamPort}/v1/messages`,
        Date.now()
      )

      expect(capturedHeaders['x-api-key']).toBe('sk-decrypted-key')
      expect(capturedHeaders['anthropic-version']).toBe('2023-06-01')
    })
  })
})
