#!/usr/bin/env node
/**
 * Codex-Switch dev startup script
 *
 * In sandboxed environments, ELECTRON_RUN_AS_NODE=1 is set by default,
 * which prevents Electron from launching as a GUI application.
 * This script builds the app, starts the Vite dev server, and then
 * launches Electron with ELECTRON_RUN_AS_NODE cleared.
 */
const { spawn, execSync } = require('child_process')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const isWin = process.platform === 'win32'

/** 清除沙盒环境中的 ELECTRON_RUN_AS_NODE，让 Electron 以 GUI 模式启动 */
function makeCleanEnv() {
  const env = { ...process.env }
  // Must fully remove (not set to empty string) — empty string still triggers Node.js mode
  delete env.ELECTRON_RUN_AS_NODE
  delete env.NODE_OPTIONS
  return env
}

async function main() {
  // Step 1: Build main + preload
  console.log('[codex-switch] Building main & preload...')
  execSync('npx electron-vite build', {
    cwd: rootDir,
    env: { ...process.env, NODE_OPTIONS: '' },
    stdio: 'inherit'
  })

  // Step 2: Start Vite dev server for renderer
  console.log('[codex-switch] Starting Vite dev server...')
  const viteProc = spawn(
    isWin ? 'npx.cmd' : 'npx',
    ['vite', '--port', '5173'],
    {
      cwd: rootDir,
      env: { ...process.env, NODE_OPTIONS: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )

  let rendererUrl = ''
  viteProc.stdout.on('data', (data) => {
    const output = data.toString()
    process.stdout.write(output)
    const match = output.match(/Local:\s+(http:\/\/localhost:\d+\/)/)
    if (match) {
      rendererUrl = match[1]
    }
  })
  viteProc.stderr.on('data', (data) => {
    process.stderr.write(data)
  })

  // Step 3: Wait for Vite to be ready, then launch Electron
  await new Promise((resolve) => setTimeout(resolve, 4000))

  const electronExe = isWin
    ? path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron')

  console.log(`[codex-switch] Launching Electron (renderer: ${rendererUrl || 'http://localhost:5173/'})...`)

  const electronProc = spawn(electronExe, ['.'], {
    cwd: rootDir,
    env: {
      ...makeCleanEnv(),
      ELECTRON_RENDERER_URL: rendererUrl || 'http://localhost:5173/'
    },
    stdio: 'inherit'
  })

  electronProc.on('close', (code) => {
    viteProc.kill()
    process.exit(code ?? 0)
  })

  electronProc.on('error', (err) => {
    console.error('[codex-switch] Failed to start Electron:', err)
    viteProc.kill()
    process.exit(1)
  })
}

main().catch((err) => {
  console.error('[codex-switch] Dev script failed:', err)
  process.exit(1)
})
