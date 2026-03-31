<template>
  <div class="cmd-overlay" @click.self="$emit('close')">
    <div class="cmd-palette">
      <input
        v-model="query"
        ref="inputEl"
        class="cmd-input"
        placeholder="Type a command or file..."
        @keydown.down.prevent="moveDown"
        @keydown.up.prevent="moveUp"
        @keydown.enter.prevent="selectAction"
        @keydown.esc.prevent="$emit('close')"
      />
      <div class="cmd-results">
        <div
          v-for="(res, idx) in filteredActions"
          :key="res.id"
          class="cmd-item"
          :class="{ active: idx === selectedIdx }"
          @mouseenter="selectedIdx = idx"
          @click="selectAction"
        >
          <span class="cmd-icon">{{ res.icon }}</span>
          <span class="cmd-label">{{ res.label }}</span>
        </div>
        <div v-if="filteredActions.length === 0" class="cmd-empty">
          No matches found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

const emit = defineEmits(['close'])
const store = useAppStore()

const inputEl = ref<HTMLInputElement | null>(null)
const query = ref('')
const selectedIdx = ref(0)

const actions = [
  { id: 'add-model', label: 'Add new Proxy API Key', icon: '🔑', action: () => { store.activeTab = 'pools'; emit('close') } },
  { id: 'rotate', label: 'Rotate API Proxy Key manually', icon: '🔄', action: () => { store.rotateKey(); emit('close') } },
  { id: 'settings', label: 'Open Settings', icon: '⚙️', action: () => { emit('close'); store.settingsOpen = true } },
  { id: 'compact', label: 'Compact Context (/compact)', icon: '🧹', action: () => { /* Emitting logic via invoke would go here */ emit('close') } },
  { id: 'clear', label: 'Clear Terminal Output', icon: '✕', action: () => { /* Clear logic */ emit('close') } },
]

const filteredActions = computed(() => {
  if (!query.value) return actions
  return actions.filter(a => a.label.toLowerCase().includes(query.value.toLowerCase()))
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
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(15, 17, 26, 0.7);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 15vh;
}

.cmd-palette {
  width: 500px;
  background: #161925;
  border: 1px solid #3b82f6;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cmd-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid #272a38;
  padding: 16px 20px;
  color: #e0e6ed;
  font-size: 1.1rem;
  outline: none;
  font-family: inherit;
}
.cmd-input::placeholder { color: #4b5563; }

.cmd-results {
  max-height: 350px;
  overflow-y: auto;
}

.cmd-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  color: #8b949e;
  border-left: 3px solid transparent;
}
.cmd-item.active {
  background: #1e2233;
  color: #e0e6ed;
  border-left-color: #3b82f6;
}

.cmd-icon { font-size: 16px; }
.cmd-label { font-size: 0.9rem; font-weight: 500; }
.cmd-empty { padding: 20px; text-align: center; color: #4b5563; font-size: 0.85rem; }
</style>
