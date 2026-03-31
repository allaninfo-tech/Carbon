<template>
  <div class="status-bar">
    <!-- Left -->
    <div class="status-section left">
      <span class="status-item accent">⚡ Carbon</span>
      <span class="status-divider">|</span>
      <span class="status-item" :class="proxyStatusClass">
        <span class="status-dot" />
        Proxy {{ proxyStatus }}
      </span>
    </div>

    <!-- Center -->
    <div class="status-section center">
      <span class="status-item">
        {{ activeKeyLabel }}
      </span>
    </div>

    <!-- Right -->
    <div class="status-section right">
      <span
        class="status-item"
        :class="tokenClass"
        title="Token budget — open Context tab for details"
        @click="store.activeTab = 'context'"
        style="cursor:pointer"
      >
        🧩 {{ formatNum(store.contextTokens) }}/{{ formatNum(store.contextLimit) }} tokens
      </span>
      <span class="status-divider">|</span>
      <span class="status-item shortcut" title="Command Palette (Ctrl+K)" @click="store.cmdPaletteOpen = true">
        ⌘K
      </span>
      <span class="status-divider">|</span>
      <span class="status-item shortcut" title="Settings" @click="store.settingsOpen = true">
        ⚙
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()

const proxyStatus = computed(() => {
  const active = store.apiKeys[store.activeKeyIndex]
  if (!active) return 'No keys'
  return active.status === 'active' ? 'Active' : active.status === 'rate-limited' ? 'Rate Limited' : 'Error'
})

const proxyStatusClass = computed(() => {
  const active = store.apiKeys[store.activeKeyIndex]
  if (!active || active.status === 'error') return 'danger'
  if (active.status === 'rate-limited') return 'warning'
  return 'ok'
})

const activeKeyLabel = computed(() => {
  const key = store.apiKeys[store.activeKeyIndex]
  return key ? `${key.provider} · ${key.label}` : 'No API Key'
})

const tokenClass = computed(() => {
  const pct = store.contextPercent
  if (pct >= 85) return 'danger'
  if (pct >= 60) return 'warning'
  return ''
})

function formatNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 26px;
  background: #0d0f19;
  border-top: 1px solid #1e2233;
  padding: 0 12px;
  font-size: 0.72rem;
  font-family: 'Cascadia Code', 'JetBrains Mono', monospace;
  flex-shrink: 0;
  z-index: 50;
  user-select: none;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-section.center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.status-item {
  color: #4b5563;
  white-space: nowrap;
}

.status-item.accent { color: #3b82f6; font-weight: 700; }
.status-item.ok span, .status-item.ok { color: #2ea043; }
.status-item.warning span, .status-item.warning { color: #f59e0b; }
.status-item.danger span, .status-item.danger { color: #da3633; }

.status-item.shortcut {
  cursor: pointer;
  padding: 0 4px;
  border-radius: 3px;
  transition: all 0.12s;
}
.status-item.shortcut:hover { background: #1e2233; color: #e0e6ed; }

.status-divider { color: #272a38; }

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  margin-right: 4px;
  vertical-align: middle;
}
</style>
