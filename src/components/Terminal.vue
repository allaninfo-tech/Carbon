<template>
  <div class="terminal-panel" @click="focusTerminal">


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
      
      <div class="term-controls-wrapper">
        <div class="font-stepper">
          <button class="step-btn" @click="fontSize = Math.max(10, fontSize - 1)">-</button>
          <div class="font-display">
            <span class="font-val">{{ fontSize }}</span>
            <span class="font-unit">PX</span>
          </div>
          <button class="step-btn" @click="fontSize = Math.min(20, fontSize + 1)">+</button>
        </div>
        <div class="sep-v" />
        <button class="action-icon-btn" title="Clear terminal" @click="clearTerminal">
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
            <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Terminal viewport with Tactical Framing -->
    <div 
      class="terminal-viewport-wrapper" 
      :class="{ 
        'is-streaming': isPtyActive, 
        'is-idle': !isPtyActive,
        'rotation-glitch': rotationGlitch
      }"
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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
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
const rotationGlitch = ref(false)
let activityTimeout: ReturnType<typeof setTimeout> | null = null
let ledTimeout: ReturnType<typeof setTimeout> | null = null
let linkTimeout: ReturnType<typeof setTimeout> | null = null

// Watch for pool rotation to trigger "Glitch" effect
watch(() => store.activeKeyIndex, () => {
  rotationGlitch.value = true
  setTimeout(() => { rotationGlitch.value = false }, 450)
})

function focusTerminal() {
  term?.focus()
}

// Session management (UI only — single PTY for now)
interface Session { id: string; label: string }
const sessions = ref<Session[]>([{ id: 'main', label: 'sh' }])
const activeSession = ref('main')

function addSession() {
  const id = `session-${Date.now()}`
  sessions.value.push({ id, label: 'sh' })
  activeSession.value = id
}

watch(fontSize, (newVal) => {
  if (term) {
    term.options.fontSize = newVal
    fitAddon?.fit()
    term.scrollToBottom()
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
  
  // Custom shell prompt injection (Tactical style)
  // We send this right after boot to clean up the CMD/PowerShell output
  if (navigator.platform.includes('Win')) {
    invoke('pty_write', { data: 'prompt $E[38;2;30;207;160mCARBON$E[0m $E[38;2;79;156;249m// $E[0m\r' })
  }

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
    lineHeight: 1.6,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 10000,
    convertEol: true,
    allowTransparency: true,
    letterSpacing: 0.2,
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

  const handleResize = () => {
    fitAddon?.fit()
    term?.scrollToBottom()
  }
  window.addEventListener('resize', handleResize)
  
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    unlisten?.()
    compactUnlisten?.()
    resizeObserver?.disconnect()
    term?.dispose()
    if (activityTimeout) clearTimeout(activityTimeout)
    if (ledTimeout) clearTimeout(ledTimeout)
    if (linkTimeout) clearTimeout(linkTimeout)
  })
})

function clearTerminal() {
  term?.clear()
}
</script>

<style scoped>
.tactical-hud-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  padding: 24px;
}

.hud-panel {
  position: absolute;
  background: rgba(13, 16, 23, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  padding: 12px 14px;
  border-radius: 8px;
  min-width: 140px;
  z-index: 30;
}

.hud-top-right {
  top: 40px;
  right: 44px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hud-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.hud-label {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: var(--text-muted);
  font-weight: 800;
  letter-spacing: 0.1em;
}

.hud-value {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--accent-blue);
  font-weight: 700;
}

.hud-divider {
  height: 1px;
  background: rgba(255,255,255,0.08);
  margin: 4px 0;
}

.hud-context-group { display: flex; flex-direction: column; gap: 6px; }
.hud-progress-track { height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
.hud-progress-fill { height: 100%; border-radius: 2px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
.hud-progress-fill.ok      { background: var(--accent-teal); box-shadow: 0 0 8px rgba(30,207,160,0.4); }
.hud-progress-fill.warning { background: var(--accent-amber); box-shadow: 0 0 8px rgba(245,158,11,0.4); }
.hud-progress-fill.danger  { background: var(--accent-red); box-shadow: 0 0 8px rgba(239,68,68,0.4); }

.hud-context-meta { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-secondary); margin-top: 2px; }
.hud-model-id { opacity: 0.5; }

.node-indicator {
  position: absolute;
  top: 40px;
  left: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  z-index: 30;
}

.node-signal { width: 4px; height: 4px; border-radius: 50%; background: var(--text-muted); }
.node-active .node-signal { background: var(--accent-blue); animation: signal-pulse 1.5s infinite; }
@keyframes signal-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.5); } }

.node-text { font-family: var(--font-mono); font-size: 0.58rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.1em; }
.node-active .node-text { color: var(--accent-blue); }

/* Layout Structure */
.terminal-panel {
  flex: 1;
  background: #050608;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.breadcrumb-bar {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(13, 16, 23, 0.4);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.tab-bar {
  height: 38px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  background: rgba(13, 16, 23, 0.2);
  border-bottom: 1px solid rgba(255,255,255,0.03);
  flex-shrink: 0;
}

.breadcrumb-left, .breadcrumb-right {
  display: flex;
  align-items: center;
  gap: 12px;
  display: none;
}

.terminal-viewport-wrapper {
  position: relative;
  flex: 1;
  background: #080a0f;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.terminal-container {
  flex: 1;
  padding: 24px 32px;
  overflow: hidden;
  z-index: 10;
}

/* Agent & Model Badges */
.agent-badge, .model-badge {
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  height: 28px;
  padding: 0 10px;
  gap: 8px;
  position: relative;
  overflow: hidden;
}

.agent-badge { 
  background: rgba(30, 207, 160, 0.03);
  border-color: rgba(30, 207, 160, 0.25);
  animation: badge-pulse 4s infinite alternate;
}

.agent-icon-wrapper { color: var(--accent-teal); display: flex; align-items: center; }
.agent-info { display: flex; flex-direction: column; justify-content: center; line-height: 1; }
.agent-label { font-size: 0.45rem; font-weight: 800; color: var(--text-muted); letter-spacing: 0.08em; }
.agent-name { font-size: 0.65rem; font-weight: 900; color: var(--accent-teal); letter-spacing: 0.02em; }
.agent-status-tag { background: rgba(30, 207, 160, 0.15); color: var(--accent-teal); font-size: 0.4rem; padding: 1px 4px; border-radius: 2px; font-weight: 900; }

.model-badge { background: rgba(124, 106, 249, 0.02); border-color: rgba(124, 106, 249, 0.2); }
.model-id { font-family: var(--font-mono); font-size: 0.5rem; color: var(--text-muted); opacity: 0.5; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 8px; }
.model-name { font-size: 0.62rem; font-weight: 700; color: var(--accent-blue); }

.tactical-coordinate {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  height: 28px;
  cursor: pointer;
  overflow: hidden;
}

.coord-tag {
  background: rgba(79, 156, 249, 0.1);
  color: var(--accent-blue);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 900;
  padding: 0 10px;
  height: 100%;
  display: flex;
  align-items: center;
  border-right: 1px solid rgba(79, 156, 249, 0.2);
}

.coord-content { padding: 0 12px; font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-secondary); }

/* Controls */
.term-controls-wrapper { display: flex; align-items: center; margin-left: auto; gap: 12px; padding-right: 12px; }
.font-stepper {
  display: flex;
  align-items: center;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  height: 24px;
  overflow: hidden;
  padding: 0 4px;
}

.step-btn {
  width: 20px;
  height: 20px;
  background: transparent;
  color: var(--accent-blue);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.step-btn:hover { opacity: 1; color: var(--text-primary); }

.font-display {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 30px;
  justify-content: center;
  padding: 0 4px;
}
.font-val { font-size: 0.62rem; font-weight: 800; color: var(--accent-blue); }
.font-unit { font-size: 0.4rem; font-weight: 900; color: var(--text-muted); }

.term-tab {
  padding: 0 14px;
  height: 24px;
  border-radius: 12px;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--text-muted);
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.term-tab.active { 
  background: linear-gradient(135deg, rgba(79, 156, 249, 0.15), rgba(79, 156, 249, 0.05)); 
  color: var(--accent-blue); 
  border-color: rgba(79, 156, 249, 0.3); 
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

@keyframes badge-pulse {
  from { border-color: rgba(30, 207, 160, 0.2); box-shadow: 0 0 5px rgba(30, 207, 160, 0.02); }
  to { border-color: rgba(30, 207, 160, 0.4); box-shadow: 0 0 10px rgba(30, 207, 160, 0.05); }
}

@keyframes blink { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }

/* Grid & Scanlines */
.carbon-grid-overlay { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(79, 156, 249, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 156, 249, 0.02) 1px, transparent 1px); background-size: 32px 32px; z-index: 1; }
.scanline-overlay { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(rgba(0,0,0,0) 50%, rgba(0, 0, 0, 0.05) 50%); background-size: 100% 4px; z-index: 2; opacity: 0.1; }

.terminal-viewport-wrapper.rotation-glitch {
  animation: glitch-anim 0.35s ease-out;
  border-color: var(--accent-amber);
}

@keyframes glitch-anim {
  0% { transform: translate(0); filter: brightness(1) hue-rotate(0deg); }
  20% { transform: translate(-2px, 1px); filter: brightness(1.8) hue-rotate(90deg); }
  40% { transform: translate(2px, -1px); filter: brightness(1.2) contrast(1.5); }
  60% { transform: translate(-1px, -1px); filter: contrast(1.2) hue-rotate(-45deg); opacity: 0.8; }
  80% { transform: translate(1px, 1px); filter: brightness(1.5); }
  100% { transform: translate(0); filter: brightness(1); }
}

.terminal-container :deep(.xterm-cursor) {
  box-shadow: 0 0 12px var(--accent-blue);
  border-radius: 1px;
}

.term-tab {
  padding: 0 12px;
  height: 28px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  transition: all 0.2s;
}
.term-tab.active { background: rgba(79, 156, 249, 0.12); color: var(--accent-blue); border-color: rgba(79, 156, 249, 0.2); }

.term-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 8px;
}

.font-size-val {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  min-width: 32px;
  text-align: center;
}

.icon-btn { 
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--text-muted); 
  transition: all 0.2s; 
}
.icon-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }

.sep-v {
  width: 1px;
  height: 14px;
  background: rgba(255,255,255,0.08);
  margin: 0 4px;
}
</style>


