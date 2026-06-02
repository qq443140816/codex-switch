#!/usr/bin/env node
/**
 * Codex-Switch production start script
 * Builds all assets and launches Electron with ELECTRON_RUN_AS_NODE cleared.
 */
const { spawn, execSync } = require('child_process')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const isWin = process.platform === 'win32'

function makeCleanEnv() {
  const env = { ...process.env }
  // Must fully remove (not set to empty string) — empty string still triggers Node.js mode
  delete env.ELECTRON_RUN_AS_NODE
  delete env.NODE_OPTIONS
  return env
}

console.log('[codex-switch] Building for production...')
execSync('npx electron-vite build', {
  cwd: rootDir,
  env: { ...process.env, NODE_OPTIONS: '' },
  stdio: 'inherit'
})

const electronExe = isWin
  ? path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron.exe')
  : path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron')

console.log('[codex-switch] Launching Codex-Switch...')

const electronProc = spawn(electronExe, ['.'], {
  cwd: rootDir,
  env: makeCleanEnv(),
  stdio: 'inherit'
})

electronProc.on('close', (code) => {
  process.exit(code ?? 0)
})

electronProc.on('error', (err) => {
  console.error('[codex-switch] Failed to start:', err)
  process.exit(1)
})
