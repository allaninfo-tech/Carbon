<template>
  <div class="app-root">
    <div class="app-container" :style="{ '--sidebar-w': sidebarWidth + 'px', '--dash-w': dashWidth + 'px' }">
      <div class="panel-wrapper explorer-wrapper">
        <Explorer />
      </div>

      <!-- Left Splitter -->
      <div class="splitter" @mousedown="startDrag('left')" />

      <div class="panel-wrapper terminal-wrapper">
        <TerminalPanel />
      </div>

      <!-- Right Splitter -->
      <div class="splitter" @mousedown="startDrag('right')" />

      <div class="panel-wrapper dashboard-wrapper">
        <Dashboard />
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
import { useAppStore } from './stores/app'
import Explorer from './components/Explorer.vue'
import TerminalPanel from './components/Terminal.vue'
import Dashboard from './components/Dashboard.vue'
import CommandPalette from './components/CommandPalette.vue'
import SettingsModal from './components/SettingsModal.vue'
import StatusBar from './components/StatusBar.vue'

const store = useAppStore()

const sidebarWidth = ref(280)
const dashWidth = ref(320)
let activeDrag: 'left' | 'right' | null = null

function startDrag(side: 'left' | 'right') {
  activeDrag = side
  document.body.style.cursor = 'col-resize'
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (activeDrag === 'left') {
    const newWidth = Math.max(150, Math.min(e.clientX, 600))
    sidebarWidth.value = newWidth
  } else if (activeDrag === 'right') {
    const newWidth = Math.max(200, Math.min(window.innerWidth - e.clientX, 800))
    dashWidth.value = newWidth
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
  
  // Listen for live context token updates from Rust proxy
  await listen<number>('context-tokens', (event) => {
    store.setContextTokens(event.payload)
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #0f111a;
}

.app-container {
  display: flex;
  flex: 1;
  width: 100vw;
  overflow: hidden;
}

.panel-wrapper { display: flex; flex-direction: column; overflow: hidden; }
.explorer-wrapper { width: var(--sidebar-w); flex-shrink: 0; }
.dashboard-wrapper { width: var(--dash-w); flex-shrink: 0; }
.terminal-wrapper { flex: 1; min-width: 0; }

.splitter {
  width: 4px;
  background: #272a38;
  cursor: col-resize;
  transition: background 0.15s;
  z-index: 10;
}
.splitter:hover, .splitter:active {
  background: #3b82f6;
}
</style>