<template>
  <div class="terminal-panel">
    <div class="terminal-header">
      <div class="terminal-header-left">
        <span class="terminal-icon">⚡</span>
        <span class="terminal-title">Terminal</span>
        <span v-if="projectPath" class="terminal-cwd">{{ shortPath }}</span>
      </div>
      <div class="terminal-header-right">
        <button class="icon-btn" title="Clear" @click="clearTerminal">✕</button>
      </div>
    </div>
    <div ref="terminalEl" class="terminal-container" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const terminalEl = ref<HTMLElement | null>(null)
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let unlisten: (() => void) | null = null
let compactUnlisten: (() => void) | null = null

const projectPath = computed(() => store.projectPath)
const shortPath = computed(() => {
  const p = store.projectPath
  if (!p) return ''
  const parts = p.replace(/\\/g, '/').split('/')
  return '~/' + parts.slice(-2).join('/')
})

onMounted(async () => {
  if (!terminalEl.value) return

  term = new Terminal({
    theme: {
      background: '#0f111a',
      foreground: '#e0e6ed',
      cursor: '#3b82f6',
      selectionBackground: 'rgba(59,130,246,0.3)',
      black: '#1e2233',
      blue: '#3b82f6',
      cyan: '#22d3ee',
      green: '#2ea043',
      red: '#da3633',
      yellow: '#f59e0b',
      magenta: '#a855f7',
      white: '#e0e6ed',
    },
    fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", monospace',
    fontSize: 14,
    lineHeight: 1.5,
    cursorBlink: true,
    cursorStyle: 'bar',
    scrollback: 5000,
    convertEol: true,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(terminalEl.value)
  fitAddon.fit()

  // Write banners
  term.writeln('\x1b[36m  ██████╗ █████╗ ██████╗ ██████╗  ██████╗ ███╗   ██╗\x1b[0m')
  term.writeln('\x1b[36m ██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗████╗  ██║\x1b[0m')
  term.writeln('\x1b[34m ██║     ███████║██████╔╝██████╔╝██║   ██║██╔██╗ ██║\x1b[0m')
  term.writeln('\x1b[34m ██║     ██╔══██║██╔══██╗██╔══██╗██║   ██║██║╚██╗██║\x1b[0m')
  term.writeln('\x1b[35m ╚██████╗██║  ██║██║  ██║██████╔╝╚██████╔╝██║ ╚████║\x1b[0m')
  term.writeln('\x1b[35m  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═══╝\x1b[0m')
  term.writeln('')
  term.writeln('\x1b[2m  AI Orchestration Layer — powered by Carbon\x1b[0m')
  term.writeln('\x1b[2m  Proxy: http://127.0.0.1:14201  |  Pool: Initializing...\x1b[0m')
  term.writeln('')

  // Spawn PTY
  await invoke('spawn_pty').catch((e: unknown) => {
    term?.writeln(`\x1b[31m[Carbon] PTY Error: ${e}\x1b[0m`)
  })

  // Stream output from Rust PTY
  unlisten = await listen<string>('pty-out', (event) => {
    term?.write(event.payload)
  })

  // Auto-compact trigger
  compactUnlisten = await listen('context-compact', () => {
    term?.writeln('\r\n\x1b[33m[Carbon] ⚠ Context at 85%+ — sending /compact...\x1b[0m\r\n')
    invoke('pty_write', { data: '/compact\r' })
  })

  // Keyboard input → Rust PTY
  term.onData((data) => {
    invoke('pty_write', { data })
  })

  // ResizeObserver → PTY resize sync
  resizeObserver = new ResizeObserver(() => {
    if (!fitAddon || !term) return
    try {
      fitAddon.fit()
      invoke('pty_resize', { rows: term.rows, cols: term.cols })
    } catch {}
  })
  resizeObserver.observe(terminalEl.value)
})

onBeforeUnmount(() => {
  unlisten?.()
  compactUnlisten?.()
  resizeObserver?.disconnect()
  term?.dispose()
})

function clearTerminal() {
  term?.clear()
}
</script>

<style scoped>
.terminal-panel {
  flex: 1;
  background: #0f111a;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #161925;
  border-bottom: 1px solid #272a38;
  flex-shrink: 0;
}

.terminal-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.terminal-icon {
  font-size: 14px;
}

.terminal-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8b949e;
}

.terminal-cwd {
  font-size: 0.75rem;
  color: #4b5563;
  font-family: 'Cascadia Code', monospace;
  background: #272a38;
  padding: 2px 8px;
  border-radius: 4px;
}

.terminal-header-right {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  color: #4b5563;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}
.icon-btn:hover {
  color: #e0e6ed;
  background: #272a38;
}

.terminal-container {
  flex: 1;
  padding: 8px;
  overflow: hidden;
}

/* Override xterm.js canvas sizing */
.terminal-container :deep(.xterm) {
  height: 100%;
  width: 100%;
}
.terminal-container :deep(.xterm-viewport) {
  background: transparent !important;
}
</style>
