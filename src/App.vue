<template>
  <div class="app-root">
    <div class="app-container" :style="{ '--sidebar-w': sidebarWidth + 'px' }">
      <!-- Activity Bar (VS Code style) -->
      <div class="activity-bar">
        <div class="activity-top">
          <button
            class="activity-btn"
            :class="{ active: store.activeActivity === 'explorer' && store.sidebarOpen }"
            title="Explorer"
            @click="toggleActivity('explorer')"
          >
            <svg viewBox="0 0 16 16" width="22" height="22" fill="none">
              <path d="M1.5 3.5A1 1 0 012.5 2.5h4l1.5 1.5H13a1 1 0 011 1v7a1 1 0 01-1 1H2.5a1 1 0 01-1-1v-7z" stroke="currentColor" stroke-width="1.2" fill="none"/>
            </svg>
          </button>
          
          <button
            class="activity-btn"
            :class="{ active: store.activeActivity === 'pool' && store.sidebarOpen }"
            title="Pools & Models"
            @click="toggleActivity('pool')"
          >
            <svg viewBox="0 0 16 16" width="22" height="22" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
              <path d="M5 8l2 2L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button
            class="activity-btn"
            :class="{ active: store.activeActivity === 'chat' && store.sidebarOpen }"
            title="Chat & Context"
            @click="toggleActivity('chat')"
          >
            <svg viewBox="0 0 16 16" width="22" height="22" fill="none">
              <path d="M14 10a1 1 0 01-1 1H5L2 14V4a1 1 0 011-1h10a1 1 0 011 1v6z" stroke="currentColor" stroke-width="1.2" fill="none"/>
            </svg>
          </button>
        </div>

        <div class="activity-bottom">
          <button class="activity-btn" title="Settings" @click="store.settingsOpen = true">
            <svg viewBox="0 0 16 16" width="20" height="20" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
              <path d="M8 2v1M8 13v1M2 8h1M13 8h1M3.8 3.8l.7.7M11.5 11.5l.7.7M3.8 12.2l.7-.7M11.5 4.5l.7-.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Left Sidebar Panel (Explorer/Chat only) -->
      <div v-show="store.sidebarOpen" class="sidebar-panel" :style="{ width: sidebarWidth + 'px' }">
        <!-- Show Explorer by default if Pool is active, so user can see files -->
        <Explorer v-if="store.activeActivity === 'explorer' || store.activeActivity === 'pool'" />
        <SidebarChat v-if="store.activeActivity === 'chat'" />
      </div>

      <!-- Full-Page Pools Dashboard Overlay (Removed in favor of inline component) -->


      <!-- Splitter for Sidebar -->
      <div v-show="store.sidebarOpen" class="splitter" :class="{ dragging: activeDrag === 'left' }" @mousedown="startDrag('left')" />

      <!-- Main Content Panel -->
      <div class="panel-wrapper main-panel">
        <TerminalPanel v-show="store.activeActivity !== 'pool'" />
        
        <!-- Full-Page Pools Dashboard -->
        <transition name="fade-scale">
          <PoolsDashboard v-if="store.activeActivity === 'pool'" />
        </transition>
      </div>

    </div>

    <!-- Persistent bottom status bar -->
    <StatusBar />

    <!-- Overlays -->
    <CommandPalette v-if="store.cmdPaletteOpen" @close="store.cmdPaletteOpen = false" />
    <SettingsModal v-if="store.settingsOpen" @close="store.settingsOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { useAppStore, type ActivityId } from './stores/app'
import Explorer from './components/Explorer.vue'
import TerminalPanel from './components/Terminal.vue'
import SidebarChat from './components/SidebarChat.vue'
import PoolsDashboard from './components/PoolsDashboard.vue'
import CommandPalette from './components/CommandPalette.vue'
import SettingsModal from './components/SettingsModal.vue'
import StatusBar from './components/StatusBar.vue'

const store = useAppStore()

const sidebarWidth = ref(260)
let activeDrag: 'left' | null = null

function toggleActivity(id: ActivityId) {
  if (store.activeActivity === id) {
    store.sidebarOpen = !store.sidebarOpen
  } else {
    store.activeActivity = id
    store.sidebarOpen = true
  }
}

function startDrag(side: 'left') {
  activeDrag = side
  document.body.style.cursor = 'col-resize'
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (activeDrag === 'left') {
    // Account for activity bar width (48px)
    const newWidth = Math.max(160, Math.min(e.clientX - 48, 600))
    sidebarWidth.value = newWidth
  }
}

function stopDrag() {
  activeDrag = null
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    store.cmdPaletteOpen = true
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  await listen<number>('context-tokens', (event) => {
    store.setContextTokens(event.payload)
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
/* ━━━━━━ DESIGN TOKENS ━━━━━━ */
:root {
  --bg-base:        #090b10;
  --bg-surface-1:   #0d1017;
  --bg-surface-2:   #111520;
  --bg-surface-3:   #161c28;
  --border-subtle:  rgba(255,255,255,0.06);
  --border-mid:     rgba(255,255,255,0.10);
  --accent-blue:    #4f9cf9;
  --accent-violet:  #7c6af9;
  --accent-teal:    #1ecfa0;
  --accent-amber:   #f59e0b;
  --accent-red:     #ef4444;
  --text-primary:   #e2e8f0;
  --text-secondary: #8892a4;
  --text-muted:     #4b5563;
  --font-ui:        'Inter', system-ui, sans-serif;
  --font-heading:   'Syne', 'Inter', sans-serif;
  --font-mono:      'JetBrains Mono', 'Cascadia Code', monospace;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-ui);
  background: var(--bg-base);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--bg-base);
}

.app-container {
  display: flex;
  flex: 1;
  width: 100vw;
  overflow: hidden;
  min-height: 0;
}

.panel-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.main-panel  { flex: 1; min-width: 0; position: relative; }

/* VS Code style Activity Bar */
.activity-bar {
  width: 48px;
  background: var(--bg-surface-1);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px 0;
  flex-shrink: 0;
  z-index: 10;
}

.activity-top, .activity-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.activity-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
  position: relative;
}

.activity-btn:hover {
  color: var(--text-primary);
}

.activity-btn.active {
  color: var(--text-primary);
}

.activity-btn.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--accent-blue);
  border-radius: 0 2px 2px 0;
}

/* Sidebar Area */
.sidebar-panel {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface-2);
  border-right: 1px solid var(--border-subtle);
  flex-shrink: 0;
  overflow: hidden;
}

/* Splitter */
.splitter {
  width: 1px;
  background: var(--border-subtle);
  cursor: col-resize;
  transition: background 0.2s, width 0.2s;
  z-index: 10;
  flex-shrink: 0;
  position: relative;
}
.splitter::after {
  content: '';
  position: absolute;
  top: 0;
  left: -3px;
  width: 7px;
  height: 100%;
  cursor: col-resize;
}
.splitter:hover,
.splitter.dragging {
  background: rgba(79, 156, 249, 0.4);
  width: 1px;
  box-shadow: 0 0 6px rgba(79, 156, 249, 0.3);
}

/* Animations */
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: all 0.25s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>