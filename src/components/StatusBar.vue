<template>
  <div class="status-bar">
    <!-- Left: Logo + proxy status -->
    <div class="sb-section sb-left">
      <div class="carbon-logo">
        <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
          <circle cx="7" cy="7" r="6" stroke="var(--accent-blue)" stroke-width="1.3" fill="none"/>
          <path d="M4.5 7a2.5 2.5 0 115 0" stroke="var(--accent-blue)" stroke-width="1.3" stroke-linecap="round" fill="none"/>
          <circle cx="7" cy="7" r="1.2" fill="var(--accent-blue)"/>
        </svg>
        <span class="logo-text">Carbon</span>
      </div>
      <span class="sb-divider" />
      <div class="proxy-indicator" :class="proxyClass">
        <span class="proxy-dot" />
        <span class="proxy-label">Proxy {{ proxyStatus }}</span>
      </div>
    </div>

    <!-- Center: Active provider + key -->
    <div class="sb-section sb-center">
      <span class="center-provider">{{ activeProvider }}</span>
      <span class="center-sep">·</span>
      <span class="center-key">{{ activeKeyLabel }}</span>
    </div>

    <!-- Right: token counter, request count, settings -->
    <div class="sb-section sb-right">
      <span
        class="token-counter"
        :class="tokenClass"
        title="Token budget (click to view Context tab)"
        @click="store.activeTab = 'context'"
      >
        <svg viewBox="0 0 11 11" width="9" height="9" fill="none">
          <rect x="1" y="1" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.1" fill="none"/>
          <path d="M3 5.5h5M3 3.5h3" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        {{ formatTok(store.contextTokens) }}/{{ formatLimit(store.contextLimit) }}
      </span>
      <span class="sb-divider" />
      <span class="req-counter">
        <svg viewBox="0 0 11 11" width="9" height="9" fill="none">
          <path d="M1.5 9l3-3 2 2 3-4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ totalRequests }} req
      </span>
      <span class="sb-divider" />
      <button class="settings-btn" title="Settings (Ctrl+,)" @click="store.settingsOpen = true">
        <svg viewBox="0 0 13 13" width="11" height="11" fill="none">
          <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" stroke-width="1.1" fill="none"/>
          <path d="M6.5 1v1M6.5 11v1M1 6.5h1M11 6.5h1M2.6 2.6l.7.7M9.7 9.7l.7.7M2.6 10.4l.7-.7M9.7 3.3l.7-.7" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="settings-btn" title="Command Palette (Ctrl+K)" @click="store.cmdPaletteOpen = true">
        <svg viewBox="0 0 13 13" width="11" height="11" fill="none">
          <rect x="1" y="1" width="11" height="11" rx="2.5" stroke="currentColor" stroke-width="1.1" fill="none"/>
          <path d="M4 5l2 2-2 2M7 9h2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()

const proxyStatus = computed(() => {
  const active = store.apiKeys[store.activeKeyIndex]
  if (!active) return 'Offline'
  if (active.status === 'active') return 'Active'
  if (active.status === 'rate-limited') return 'Limited'
  if (active.status === 'idle') return 'Idle'
  return 'Error'
})

const proxyClass = computed(() => {
  const active = store.apiKeys[store.activeKeyIndex]
  if (!active || active.status === 'error') return 'proxy-error'
  if (active.status === 'rate-limited') return 'proxy-warn'
  if (active.status === 'idle') return 'proxy-idle'
  return 'proxy-ok'
})

const activeProvider = computed(() => {
  const key = store.apiKeys[store.activeKeyIndex]
  return key ? key.provider : '—'
})

const activeKeyLabel = computed(() => {
  const key = store.apiKeys[store.activeKeyIndex]
  return key ? key.label : 'no key'
})

const totalRequests = computed(() =>
  store.apiKeys.reduce((s, k) => s + k.requestCount, 0)
)

const tokenClass = computed(() => {
  const pct = store.contextPercent
  if (pct >= 85) return 'token-danger'
  if (pct >= 60) return 'token-warn'
  return ''
})

function formatTok(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatLimit(n: number) {
  return (n / 1000).toFixed(0) + 'k'
}
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  background: var(--bg-surface-1);
  border-top: 1px solid var(--border-subtle);
  padding: 0 10px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  flex-shrink: 0;
  z-index: 50;
  user-select: none;
  position: relative;
}

.sb-section {
  display: flex;
  align-items: center;
  gap: 7px;
}

.sb-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  gap: 5px;
}

/* Logo */
.carbon-logo {
  display: flex;
  align-items: center;
  gap: 5px;
}

.logo-text {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

/* Proxy indicator */
.proxy-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
}

.proxy-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.proxy-label { font-size: 0.65rem; }

.proxy-ok    { color: var(--accent-teal); }
.proxy-warn  { color: var(--accent-amber); }
.proxy-idle  { color: var(--text-muted); }
.proxy-error { color: var(--accent-red); }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}
.proxy-ok .proxy-dot {
  animation: pulse-dot 2.5s ease-in-out infinite;
}

/* Center */
.center-provider {
  color: var(--text-secondary);
  font-size: 0.65rem;
}
.center-sep { color: var(--border-mid); }
.center-key { color: var(--accent-blue); }

/* Right items */
.sb-divider {
  width: 1px;
  height: 10px;
  background: var(--border-subtle);
}

.token-counter {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 1px 4px;
  border-radius: 3px;
  transition: all 0.12s;
}
.token-counter:hover { color: var(--text-secondary); background: var(--bg-surface-2); }
.token-counter.token-warn   { color: var(--accent-amber); }
.token-counter.token-danger { color: var(--accent-red); }

.req-counter {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.12s;
}
.settings-btn:hover { color: var(--text-secondary); background: var(--bg-surface-2); }
</style>
