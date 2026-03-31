<template>
  <div class="cmd-overlay" @click.self="$emit('close')">
    <div class="cmd-palette">
      <!-- Search input -->
      <div class="cmd-search-row">
        <svg viewBox="0 0 14 14" width="13" height="13" fill="none" class="search-icon">
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.3" fill="none"/>
          <path d="M9 9l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <input
          v-model="query"
          ref="inputEl"
          class="cmd-input"
          placeholder="Type a command..."
          @keydown.down.prevent="moveDown"
          @keydown.up.prevent="moveUp"
          @keydown.enter.prevent="selectAction"
          @keydown.esc.prevent="$emit('close')"
        />
        <kbd class="esc-hint">ESC</kbd>
      </div>

      <!-- Results -->
      <div class="cmd-results">
        <div
          v-for="(res, idx) in filteredActions"
          :key="res.id"
          class="cmd-item"
          :class="{ active: idx === selectedIdx }"
          @mouseenter="selectedIdx = idx"
          @click="selectAction"
        >
          <span class="cmd-icon-wrap">
            <component :is="res.icon" />
          </span>
          <div class="cmd-text">
            <span class="cmd-label">{{ res.label }}</span>
            <span v-if="res.hint" class="cmd-hint">{{ res.hint }}</span>
          </div>
          <kbd v-if="res.shortcut" class="cmd-kb">{{ res.shortcut }}</kbd>
        </div>
        <div v-if="filteredActions.length === 0" class="cmd-empty">
          No commands match "{{ query }}"
        </div>
      </div>

      <!-- Footer -->
      <div class="cmd-footer">
        <span>
          <kbd class="cmd-kb small">↑↓</kbd> navigate
        </span>
        <span>
          <kbd class="cmd-kb small">↵</kbd> select
        </span>
        <span>
          <kbd class="cmd-kb small">ESC</kbd> close
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useAppStore } from '../stores/app'

const emit = defineEmits(['close'])
const store = useAppStore()

const inputEl = ref<HTMLInputElement | null>(null)
const query = ref('')
const selectedIdx = ref(0)

// Icon helpers
const KeyIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('circle', { cx: 4.5, cy: 7.5, r: 3, stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none' }),
  h('path', { d: 'M7.5 7.5L10 5M10 5l1 1M10 5V3.5', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round' })
])
const RotateIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('path', { d: 'M10 6A4 4 0 112 6', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round', fill: 'none' }),
  h('path', { d: 'M10 3v3h-3', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
])
const GearIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('circle', { cx: 6, cy: 6, r: 1.8, stroke: 'currentColor', 'stroke-width': 1.1, fill: 'none' }),
  h('path', { d: 'M6 1.5v1M6 9.5v1M1.5 6h1M9.5 6h1M2.9 2.9l.7.7M8.4 8.4l.7.7M2.9 9.1l.7-.7M8.4 3.6l.7-.7', stroke: 'currentColor', 'stroke-width': 1, 'stroke-linecap': 'round' })
])
const CompactIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('path', { d: 'M2 9l4-6 4 6M4 11h4', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
])
const ClearIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('path', { d: 'M2 10L10 2M2 2l8 8', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round' })
])
const PoolIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('rect', { x: 1.5, y: 1.5, width: 9, height: 9, rx: 2, stroke: 'currentColor', 'stroke-width': 1.1, fill: 'none' }),
  h('path', { d: 'M4 6l1.5 1.5L8 4', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
])

const actions = [
  {
    id: 'add-key',
    label: 'Add API Key to Pool',
    hint: 'Open the Pools tab to configure',
    icon: KeyIcon,
    shortcut: '',
    action: () => { store.activeActivity = 'pool'; store.sidebarOpen = true; emit('close') }
  },
  {
    id: 'rotate',
    label: 'Rotate Proxy Key',
    hint: 'Manually switch to next key in pool',
    icon: RotateIcon,
    shortcut: '',
    action: () => { store.rotateKey(); emit('close') }
  },
  {
    id: 'pools',
    label: 'View API Pool',
    hint: 'Open the Pools dashboard tab',
    icon: PoolIcon,
    shortcut: '',
    action: () => { store.activeActivity = 'pool'; store.sidebarOpen = true; emit('close') }
  },
  {
    id: 'compact',
    label: 'Compact Context (/compact)',
    hint: 'Send /compact to reduce token usage',
    icon: CompactIcon,
    shortcut: '',
    action: () => { store.activeActivity = 'chat'; store.sidebarOpen = true; emit('close') }
  },
  {
    id: 'settings',
    label: 'Open Settings',
    hint: 'Configure Carbon preferences',
    icon: GearIcon,
    shortcut: 'Ctrl+,',
    action: () => { emit('close'); store.settingsOpen = true }
  },
  {
    id: 'clear',
    label: 'Clear Terminal Output',
    hint: 'Wipe the terminal viewport',
    icon: ClearIcon,
    shortcut: '',
    action: () => { emit('close') }
  },
]

const filteredActions = computed(() => {
  if (!query.value) return actions
  const q = query.value.toLowerCase()
  return actions.filter(a =>
    a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q)
  )
})

function moveDown() {
  if (selectedIdx.value < filteredActions.value.length - 1) selectedIdx.value++
}
function moveUp() {
  if (selectedIdx.value > 0) selectedIdx.value--
}
function selectAction() {
  const item = filteredActions.value[selectedIdx.value]
  if (item) item.action()
}

onMounted(() => {
  inputEl.value?.focus()
})
</script>

<style scoped>
.cmd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(9, 11, 16, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
}

.cmd-palette {
  width: 520px;
  background: rgba(17, 21, 32, 0.65);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.03) inset,
    0 30px 60px rgba(0,0,0,0.8),
    0 0 40px rgba(79,156,249,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Search row */
.cmd-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
}

.search-icon { color: var(--text-muted); flex-shrink: 0; }

.cmd-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 0.95rem;
  outline: none;
}
.cmd-input::placeholder { color: var(--text-muted); }

.esc-hint {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  color: var(--text-muted);
  background: var(--bg-surface-3);
  border: 1px solid var(--border-subtle);
  padding: 2px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* Results */
.cmd-results {
  max-height: 340px;
  overflow-y: auto;
  padding: 6px;
}

.cmd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  cursor: pointer;
  border-radius: 7px;
  transition: background 0.12s;
}
.cmd-item:hover,
.cmd-item.active {
  background: var(--bg-surface-3);
}

.cmd-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--bg-surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.cmd-item.active .cmd-icon-wrap {
  border-color: rgba(79,156,249,0.3);
  color: var(--accent-blue);
}

.cmd-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cmd-label {
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-primary);
}
.cmd-item.active .cmd-label { color: var(--text-primary); }

.cmd-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.cmd-kb {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--text-muted);
  background: var(--bg-surface-1);
  border: 1px solid var(--border-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.cmd-kb.small { font-size: 0.58rem; padding: 1px 5px; }

.cmd-empty {
  padding: 20px;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

/* Footer */
.cmd-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 18px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-1);
  font-size: 0.65rem;
  color: var(--text-muted);
}
</style>
