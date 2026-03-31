<template>
  <div class="terminal-panel" @click="focusTerminal">
    <!-- Breadcrumb bar -->
    <div class="breadcrumb-bar">
      <div class="breadcrumb-left">
        <span class="status-badge" :class="{ 'is-active': isPtyActive, 'is-booting': isBooting }">
          <span class="status-dot"></span>
          {{ isBooting ? 'BOOTING' : (isPtyActive ? 'LIVE' : 'IDLE') }}
        </span>
        <span class="crumb-sep">/</span>
        <span class="crumb agent-crumb">
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
            <circle cx="5" cy="5" r="4" stroke="var(--accent-teal)" stroke-width="1.2"/>
            <circle cx="5" cy="5" r="1.5" fill="var(--accent-teal)"/>
          </svg>
          Claude Code
        </span>
        <span class="crumb-sep">/</span>
        <span class="crumb model-crumb">{{ activeModel }}</span>
      </div>
      
      <div class="breadcrumb-right">
        <!-- Dual HCI LEDs -->
        <div class="telemetry-leds">
          <div class="led-item" title="Local Link Activity">
            <span class="led-label">LINK</span>
            <div class="led-bulb white" :class="{ 'led-flash-white': linkLedBlink }"></div>
          </div>
          <div class="led-item" title="Remote Sync Activity">
            <span class="led-label">SYNC</span>
            <div class="led-bulb blue" :class="{ 'led-flash-blue': syncLedBlink }"></div>
          </div>
        </div>
        
        <span class="crumb-sep">|</span>
        <span v-if="projectPath" class="crumb path-crumb" :class="{ 'is-linking': isTypingPath }" @click.stop="handlePathClick" title="Click to open folder">
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" class="path-icon">
            <path d="M1 4L5 1l4 3v5H1V4z" stroke="currentColor" stroke-width="1" fill="none"/>
          </svg>
          <span class="path-text">{{ displayPath }}</span>
          <span v-if="isTypingPath" class="path-cursor">█</span>
        </span>
      </div>
    </div>

    <!-- Tab bar for terminal sessions -->
    <div class="tab-bar">
      <div class="session-tabs" v-auto-animate>
        <button
          v-for="(tab, i) in sessions"
          :key="tab.id"
          class="term-tab"
          :class="{ active: activeSession === tab.id }"
          @click="activeSession = tab.id"
        >
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" class="tab-icon">
            <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1" fill="none"/>
            <path d="M3 4l2 1.5L3 7" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          </svg>
          sh:{{ i + 1 }}
        </button>
      </div>
      
      <button class="term-tab-add" @click="addSession" title="New terminal session">
        <svg viewBox="0 0 10 10" width="9" height="9" fill="none">
          <path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </button>
      
      <div class="tab-bar-spacer" />
      
      <div class="term-controls">
        <button class="icon-btn" title="Decrease Font" @click="fontSize = Math.max(10, fontSize - 1)">
          <svg viewBox="0 0 14 14" width="10" height="10" fill="none"><path d="M2 7h10" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <span class="font-size-val">{{ fontSize }}px</span>
        <button class="icon-btn" title="Increase Font" @click="fontSize = Math.min(20, fontSize + 1)">
          <svg viewBox="0 0 14 14" width="10" height="10" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <div class="sep-v" />
        <button class="icon-btn" title="Clear terminal" @click="clearTerminal">
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
            <path d="M2 12L12 2M2 2l10 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Terminal viewport with Tactical Framing -->
    <div 
      class="terminal-viewport-wrapper" 
      :class="{ 'is-streaming': isPtyActive, 'is-idle': !isPtyActive }"
    >
      <!-- Grid Overlay -->
      <div class="carbon-grid-overlay"></div>
      
      <!-- Scanline Overlay -->
      <div class="scanline-overlay"></div>

      <!-- Tactical Corner Brackets -->
      <div class="tactical-bracket top-left"></div>
      <div class="tactical-bracket top-right"></div>
      <div class="tactical-bracket bottom-left"></div>
      <div class="tactical-bracket bottom-right"></div>

      <div ref="terminalEl" class="terminal-container" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
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

// HCI States
const isPtyActive = ref(false)
const isBooting = ref(true)
const syncLedBlink = ref(false)
const linkLedBlink = ref(false)
const fontSize = ref(13)
let activityTimeout: ReturnType<typeof setTimeout> | null = null
let ledTimeout: ReturnType<typeof setTimeout> | null = null
let linkTimeout: ReturnType<typeof setTimeout> | null = null

// Session management (UI only — single PTY for now)
interface Session { id: string; label: string }
const sessions = ref<Session[]>([{ id: 'main', label: 'sh' }])
const activeSession = ref('main')

function addSession() {
  const id = `session-${Date.now()}`
  sessions.value.push({ id, label: 'sh' })
  activeSession.value = id
}

// Animated Path
const displayPath = ref('')
const isTypingPath = ref(false)
let typingInterval: any = null

function focusTerminal() {
  term?.focus()
}

const projectPath = computed(() => store.projectPath)
const shortPath = computed(() => {
  const p = store.projectPath
  if (!p) return ''
  return '~/' + p.replace(/\\/g, '/').split('/').slice(-2).join('/')
})

async function animatePath(target: string) {
  if (typingInterval) clearInterval(typingInterval)
  isTypingPath.value = true
  displayPath.value = ''
  
  const chars = target.split('')
  let idx = 0
  
  typingInterval = setInterval(() => {
    if (idx < chars.length) {
      displayPath.value += chars[idx]
      idx++
      // Blink Link LED on each character for "data stream" feel
      linkLedBlink.value = true
      setTimeout(() => { linkLedBlink.value = false }, 20)
    } else {
      clearInterval(typingInterval)
      isTypingPath.value = false
    }
  }, 30)
}

watch(shortPath, (newVal) => {
  if (newVal) animatePath(newVal)
}, { immediate: true })

const activeModel = computed(() => {
  const key = store.apiKeys[store.activeKeyIndex]
  if (!key) return '—'
  const m = key.model_id || ''
  return m.includes('/') ? m.split('/').pop()! : m
})

function handlePathClick() {
  if (store.projectPath) {
    invoke('open_path', { path: store.projectPath })
  }
}

watch(fontSize, (newVal) => {
  if (term) {
    term.options.fontSize = newVal
    fitAddon?.fit()
  }
})

async function runBootSequence() {
  if (!term) return
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

  term.writeln('\x1b[38;2;79;156;249m[BOOT] Carbon OS v0.1.0 Initializing...\x1b[0m')
  await delay(200)
  term.writeln('\x1b[2m[BOOT] Locating Proxy Server: http://127.0.0.1:14201\x1b[0m')
  await delay(150)
  term.writeln('\x1b[38;2;30;207;160m[BOOT] Link established. Status: OK\x1b[0m')
  await delay(100)
  term.writeln('\x1b[2m[BOOT] Mounting project context components...\x1b[0m')
  await delay(250)
  
  // Progress Bar
  const width = 20
  for (let i = 0; i <= width; i++) {
    const bars = '█'.repeat(i)
    const dots = ' '.repeat(width - i)
    term.write(`\r\x1b[2m[BOOT] Loading: [${bars}${dots}] ${Math.round((i/width)*100)}%\x1b[0m`)
    await delay(30)
  }
  term.writeln('\r\n\x1b[38;2;124;106;249m[BOOT] UI Orchestration Layer Ready.\x1b[0m\r\n')
  isBooting.value = false
  term.focus()
}

onMounted(async () => {
  if (!terminalEl.value) return

  term = new Terminal({
    theme: {
      background:        'transparent',
      foreground:        '#e2e8f0',
      cursor:            'rgba(79,156,249,0.95)',
      cursorAccent:      '#090b10',
      selectionBackground: 'rgba(79,156,249,0.3)',
      black:   '#0d1017',
      red:     '#ef4444',
      green:   '#1ecfa0',
      yellow:  '#f59e0b',
      blue:    '#4f9cf9',
      magenta: '#7c6af9',
      cyan:    '#22d3ee',
      white:   '#e2e8f0',
      brightBlack:   '#4b5563',
      brightRed:     '#f87171',
      brightGreen:   '#34d399',
      brightYellow:  '#fbbf24',
      brightBlue:    '#60a5fa',
      brightMagenta: '#a78bfa',
      brightCyan:    '#67e8f9',
      brightWhite:   '#f8fafc',
    },
    fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
    fontSize: fontSize.value,
    lineHeight: 1.5,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 5000,
    convertEol: true,
    allowTransparency: true,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(terminalEl.value)
  fitAddon.fit()
  term.focus()

  // Run the premium boot sequence
  await runBootSequence()

  // Banner
  term.writeln('\x1b[38;2;79;156;249m  ██████╗ █████╗ ██████╗ ██████╗  ██████╗ ███╗   ██╗\x1b[0m')
  term.writeln('\x1b[38;2;79;156;249m ██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗████╗  ██║\x1b[0m')
  term.writeln('\x1b[38;2;124;106;249m ██║     ███████║██████╔╝██████╔╝██║   ██║██╔██╗ ██║\x1b[0m')
  term.writeln('\x1b[38;2;124;106;249m ██║     ██╔══██║██╔══██╗██╔══██╗██║   ██║██║╚██╗██║\x1b[0m')
  term.writeln('\x1b[38;2;30;207;160m ╚██████╗██║  ██║██║  ██║██████╔╝╚██████╔╝██║ ╚████║\x1b[0m')
  term.writeln('\x1b[38;2;30;207;160m  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═══╝\x1b[0m')
  term.writeln('')

  await invoke('spawn_pty').catch((e: unknown) => {
    term?.writeln(`\x1b[31m[Carbon] PTY Error: ${e}\x1b[0m`)
  })

  unlisten = await listen<string>('pty-out', (event) => {
    term?.write(event.payload)

    // Sync LED (Output from PTY/AI)
    isPtyActive.value = true
    syncLedBlink.value = true
    
    if (activityTimeout) clearTimeout(activityTimeout)
    if (ledTimeout) clearTimeout(ledTimeout)

    activityTimeout = setTimeout(() => { isPtyActive.value = false }, 1200)
    ledTimeout = setTimeout(() => { syncLedBlink.value = false }, 100)
  })

  compactUnlisten = await listen('context-compact', () => {
    term?.writeln('\r\n\x1b[38;2;245;158;11m[Carbon] ⚠ Context ≥85% — dispatching /compact...\x1b[0m\r\n')
    invoke('pty_write', { data: '/compact\r' })
  })

  term.onData((data) => {
    invoke('pty_write', { data })
    
    // Link LED (Input from USER)
    linkLedBlink.value = true
    if (linkTimeout) clearTimeout(linkTimeout)
    linkTimeout = setTimeout(() => { linkLedBlink.value = false }, 80)
  })

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
  if (activityTimeout) clearTimeout(activityTimeout)
  if (ledTimeout) clearTimeout(ledTimeout)
  if (linkTimeout) clearTimeout(linkTimeout)
})

function clearTerminal() {
  term?.clear()
}
</script>

<style scoped>
.terminal-panel {
  flex: 1;
  background: #090b10;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

/* ━━━ Breadcrumb bar ━━━ */
.breadcrumb-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-surface-1);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  gap: 8px;
}

.breadcrumb-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

/* Status Badge */
.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface-3);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text-muted);
  transition: all 0.3s;
}
.status-badge.is-active {
  color: var(--accent-teal);
  border-color: rgba(30, 207, 160, 0.3);
  background: rgba(30, 207, 160, 0.05);
}
.status-badge.is-booting {
  color: var(--accent-blue);
  border-color: rgba(79, 156, 249, 0.3);
  animation: pulse-border 1s infinite alternate;
}

@keyframes pulse-border {
  from { border-color: rgba(79, 156, 249, 0.2); }
  to { border-color: rgba(79, 156, 249, 0.6); }
}

.status-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}
.is-active .status-dot { animation: pulse-dot 1.2s infinite; }

.breadcrumb-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* Dual LEDs */
.telemetry-leds {
  display: flex;
  gap: 12px;
}
.led-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.led-label {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  opacity: 0.5;
}
.led-bulb {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1a1e2a;
  transition: background 0.05s, box-shadow 0.05s;
}
.led-flash-blue {
  background: var(--accent-blue);
  box-shadow: 0 0 10px var(--accent-blue);
}
.led-flash-white {
  background: #fff;
  box-shadow: 0 0 10px #fff;
}

.crumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  white-space: nowrap;
}

.crumb-sep {
  font-size: 0.65rem;
  color: var(--border-subtle);
  opacity: 0.3;
}

.agent-crumb  { color: var(--accent-teal); }
.model-crumb  { color: var(--text-secondary); opacity: 0.7; }

/* Path Crumb Animated */
.path-crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: rgba(255,255,255,0.02);
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.path-crumb:hover {
  background: rgba(255,255,255,0.05);
  border-color: var(--border-subtle);
  color: var(--text-secondary);
}
.path-crumb.is-linking {
  background: rgba(79, 156, 249, 0.05);
  color: var(--accent-blue);
}
.path-cursor {
  font-size: 0.8rem;
  animation: cursor-blink 0.2s steps(2) infinite;
  margin-left: 1px;
}
@keyframes cursor-blink { to { opacity: 0; } }

/* ━━━ Tab bar ━━━ */
.tab-bar {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 8px;
  background: var(--bg-surface-1);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  gap: 4px;
}

.session-tabs { display: flex; gap: 2px; }

.term-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 28px;
  background: none;
  border: 1px solid transparent;
  border-radius: 5px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  cursor: pointer;
}
.term-tab.active { background: var(--bg-surface-3); color: var(--text-primary); border-color: var(--border-subtle); }
.tab-icon { opacity: 0.4; }
.active .tab-icon { color: var(--accent-blue); opacity: 1; }

.tab-bar-spacer { flex: 1; }

.term-controls { display: flex; align-items: center; gap: 4px; }
.font-size-val { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); min-width: 30px; text-align: center; }
.sep-v { width: 1px; height: 14px; background: var(--border-subtle); margin: 0 4px; }

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
}
.icon-btn:hover { color: var(--text-primary); background: var(--bg-surface-2); }

/* ━━━ Tactical Viewport ━━━ */
.terminal-viewport-wrapper {
  position: relative;
  flex: 1;
  margin: 12px;
  background: #090b10;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.terminal-viewport-wrapper.is-streaming {
  border-color: rgba(79, 156, 249, 0.6);
  box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(79, 156, 249, 0.08);
}
.terminal-viewport-wrapper.is-idle {
  opacity: 0.95;
}

/* Carbon Grid Overlay */
.carbon-grid-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(rgba(255,255,255,0.015) 1.5px, transparent 1.5px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1.5px, transparent 1.5px);
  background-size: 35px 35px;
  z-index: 1;
}

/* CRT Scanlines */
.scanline-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    rgba(18, 16, 16, 0) 50%,
    rgba(0, 0, 0, 0.06) 50%
  );
  background-size: 100% 4px;
  z-index: 2;
  opacity: 0.2;
}

/* Tactical Brackets */
.tactical-bracket {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 1.5px solid rgba(255,255,255,0.1);
  pointer-events: none;
  z-index: 10;
}
.top-left     { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }
.top-right    { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }
.bottom-left  { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }
.bottom-right { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }

.terminal-container {
  flex: 1;
  padding: 24px 28px 16px;
  overflow: hidden;
  min-height: 0;
  z-index: 5;
}

.terminal-container :deep(.xterm) {
  height: 100%;
  width: 100%;
}
.terminal-container :deep(.xterm-viewport) {
  background: transparent !important;
}

/* Premium Glowing Cursor */
.terminal-container :deep(.xterm-cursor) {
  box-shadow: 0 0 12px rgba(79, 156, 249, 0.6);
  border-radius: 1px;
}
</style>


