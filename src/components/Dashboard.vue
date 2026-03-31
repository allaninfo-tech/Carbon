<template>
  <div class="dashboard-panel">
    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: store.activeTab === tab.id }"
        @click="store.activeTab = tab.id as any"
        :id="`tab-${tab.id}`"
      >
        <component :is="tab.icon" class="tab-icon-svg" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ━━━━━━ POOLS TAB ━━━━━━ -->
    <div v-if="store.activeTab === 'pools'" class="tab-content">
      <!-- Stat chips row -->
      <div class="stat-chips">
        <div class="stat-chip">
          <span class="stat-value">{{ store.totalRpm }}</span>
          <span class="stat-label">RPM</span>
        </div>
        <div class="stat-chip">
          <span class="stat-value">{{ formatTok(store.totalTpm) }}</span>
          <span class="stat-label">TPM</span>
        </div>
        <div class="stat-chip">
          <span class="stat-value accent-teal">{{ store.activeKeyCount }}</span>
          <span class="stat-label">Active</span>
        </div>
      </div>

      <!-- Section label -->
      <div class="section-label">Pool Keys</div>

      <!-- Key cards -->
      <div class="key-list">
        <div
          v-for="(key, idx) in store.apiKeys"
          :key="key.id"
          class="key-card"
          :class="{
            'card-active': idx === store.activeKeyIndex,
            'card-rate-limited': key.status === 'rate-limited',
            'card-idle': key.status === 'idle',
            'card-error': key.status === 'error',
            'card-flash': store.flashingKeyId === key.id,
          }"
        >
          <!-- Card header row -->
          <div class="card-header">
            <span class="provider-dot" :style="{ background: providerColor(key.provider) }" />
            <span class="provider-name">{{ key.provider }}</span>
            <span class="status-pill" :class="pillClass(key.status)">
              <span class="pill-dot" />
              {{ statusLabel(key.status) }}
            </span>
            <button class="remove-btn" @click="store.removeApiKey(key.id)" title="Remove">
              <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- Key label -->
          <div class="key-label">{{ key.label }}</div>

          <!-- Health bar -->
          <div class="health-bar-track">
            <div
              class="health-bar-fill"
              :class="healthClass(key.usagePercent)"
              :style="{ width: key.usagePercent + '%' }"
            />
          </div>

          <!-- Meta row -->
          <div class="card-meta">
            <span class="meta-item">{{ key.requestCount }} req</span>
            <span class="meta-sep">·</span>
            <span class="meta-item model-tag">{{ shortModel(key.model_id) }}</span>
          </div>
        </div>

        <div v-if="store.apiKeys.length === 0" class="empty-pool">
          No keys in pool. Add one below.
        </div>
      </div>

      <!-- Add Key Form -->
      <div class="section-label" style="margin-top: 14px">Add Key</div>
      <div class="add-key-form">
        <div class="form-field">
          <label class="form-label">Provider</label>
          <select v-model="newKey.provider" class="form-input" @change="onProviderChange">
            <option value="OpenRouter">OpenRouter</option>
            <option value="Gemini">Gemini</option>
            <option value="Together">Together AI</option>
            <option value="Groq">Groq</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">Label</label>
          <input v-model="newKey.label" class="form-input" placeholder="e.g. gemini-key-2" />
        </div>
        <div class="form-field">
          <label class="form-label">API Key</label>
          <input v-model="newKey.key" class="form-input" type="password" placeholder="sk-..." />
        </div>
        <div class="form-field">
          <label class="form-label">Model</label>
          <select v-model="newKey.model_id" class="form-input">
            <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B · 128k</option>
            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro · 2M</option>
            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet · 200k</option>
            <option value="qwen/qwen-72b-instruct">Qwen 72B · 128k</option>
          </select>
        </div>
        <button class="add-btn" @click="addKey">
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Add to Pool
        </button>
      </div>
    </div>

    <!-- ━━━━━━ CONTEXT TAB ━━━━━━ -->
    <div v-if="store.activeTab === 'context'" class="tab-content">
      <!-- Token budget -->
      <div class="section-label">Token Budget</div>
      <div class="budget-block">
        <div class="budget-numbers">
          <span class="budget-used" :class="budgetClass">{{ formatTok(store.contextTokens) }}</span>
          <span class="budget-limit">/ {{ formatTok(store.contextLimit) }}</span>
          <span class="budget-pct" :class="budgetClass">{{ store.contextPercent }}%</span>
        </div>
        <div class="budget-track">
          <div
            class="budget-fill"
            :class="budgetClass"
            :style="{ width: store.contextPercent + '%' }"
          />
        </div>
      </div>

      <!-- In Context -->
      <div class="section-label" style="margin-top:16px">
        In Context
        <span class="section-count">{{ store.contextFiles.length }}</span>
      </div>
      <div v-if="store.contextFiles.length === 0" class="ctx-empty-hint">
        No files loaded into context
      </div>
      <div v-else class="ctx-file-list">
        <div v-for="f in store.contextFiles" :key="f.path" class="ctx-file-row">
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" class="file-icon">
            <path d="M2 1.5h5.5L10 4v6.5H2V1.5z" stroke="currentColor" stroke-width="1" fill="none"/>
            <path d="M7.5 1.5V4H10" stroke="currentColor" stroke-width="1"/>
          </svg>
          <span class="ctx-fname">{{ basename(f.path) }}</span>
          <span class="ctx-ftokens">{{ formatTok(f.tokens) }}</span>
          <button class="ctx-remove-btn" @click="store.removeFromContext(f.path)" title="Remove">
            <svg viewBox="0 0 10 10" width="7" height="7" fill="none">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Available files -->
      <div class="section-label" style="margin-top:14px">
        Available
        <span class="section-count">{{ store.availableFiles.length }}</span>
      </div>
      <div v-if="store.availableFiles.length === 0" class="ctx-empty-hint">
        Open a project to see files
      </div>
      <div v-else class="ctx-file-list">
        <div v-for="f in store.availableFiles" :key="f.path" class="ctx-file-row available">
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" class="file-icon">
            <path d="M2 1.5h5.5L10 4v6.5H2V1.5z" stroke="currentColor" stroke-width="1" fill="none"/>
            <path d="M7.5 1.5V4H10" stroke="currentColor" stroke-width="1"/>
          </svg>
          <span class="ctx-fname">{{ basename(f.path) }}</span>
          <span class="ctx-ftokens muted">{{ formatTok(f.tokens) }}</span>
          <button class="ctx-add-btn" @click="store.addToContext(f)" title="Add to context">
            <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
              <path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Compact button -->
      <button class="compact-btn" @click="sendCompact">
        <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
          <path d="M2 9l5-7 5 7M4 12h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        /compact context
      </button>
    </div>

    <!-- ━━━━━━ CHAT TAB ━━━━━━ -->
    <div v-if="store.activeTab === 'chat'" class="tab-content chat-tab">
      <div class="chat-meta-label">Direct chat — does not share coding context</div>

      <div class="chat-messages" ref="chatEl">
        <div v-if="store.chatMessages.length === 0" class="chat-empty">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
          <span>Ask the AI anything</span>
        </div>
        <div
          v-for="msg in store.chatMessages"
          :key="msg.timestamp"
          class="chat-bubble"
          :class="msg.role"
        >
          <div class="bubble-body">{{ msg.content }}</div>
          <div class="bubble-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>

      <div class="chat-input-area">
        <textarea
          v-model="chatInput"
          class="chat-input"
          placeholder="Message..."
          rows="2"
          @keydown.enter.exact.prevent="sendChat"
        />
        <button class="send-btn" :disabled="store.chatLoading" @click="sendChat">
          <svg v-if="!store.chatLoading" viewBox="0 0 14 14" width="14" height="14" fill="none">
            <path d="M2 12L12 7 2 2v4l8 1-8 1v4z" fill="currentColor"/>
          </svg>
          <svg v-else viewBox="0 0 14 14" width="14" height="14" fill="none" class="spin">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="20" stroke-dashoffset="10"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, h } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const chatEl = ref<HTMLElement | null>(null)
const chatInput = ref('')

// ━━━ Tab SVG Icons (inline components) ━━━
const PoolsIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('circle', { cx: 6, cy: 6, r: 4.5, stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none' }),
  h('path', { d: 'M4 6l1.5 1.5L8 4', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
])
const ContextIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('rect', { x: 1.5, y: 1.5, width: 9, height: 9, rx: 1.5, stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none' }),
  h('path', { d: 'M3.5 4.5h5M3.5 6h3', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round' })
])
const ChatIcon = () => h('svg', { viewBox: '0 0 12 12', width: 11, height: 11, fill: 'none' }, [
  h('path', { d: 'M10.5 7.5a1 1 0 01-1 1H3.5L1.5 10.5V3a1 1 0 011-1h7a1 1 0 011 1v4.5z', stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none' })
])

const tabs = [
  { id: 'pools',   label: 'Pools',   icon: PoolsIcon },
  { id: 'context', label: 'Context', icon: ContextIcon },
  { id: 'chat',    label: 'Chat',    icon: ChatIcon },
]

// Add key form
const newKey = ref({
  provider: 'OpenRouter',
  label: '',
  key: '',
  url: 'https://openrouter.ai/api/v1/messages',
  model_id: 'meta-llama/llama-3.3-70b-instruct',
})

const providerUrls: Record<string, string> = {
  OpenRouter: 'https://openrouter.ai/api/v1/messages',
  Gemini:     'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  Together:   'https://api.together.xyz/v1/chat/completions',
  Groq:       'https://api.groq.com/openai/v1/chat/completions',
  Custom:     '',
}

function onProviderChange() {
  newKey.value.url = providerUrls[newKey.value.provider] || ''
}

function addKey() {
  if (!newKey.value.key || !newKey.value.label) return
  store.addApiKey({ ...newKey.value })
  newKey.value = { provider: 'OpenRouter', label: '', key: '', url: providerUrls.OpenRouter, model_id: 'meta-llama/llama-3.3-70b-instruct' }
}

// Helpers
function providerColor(p: string) {
  const map: Record<string, string> = {
    OpenRouter: '#4f9cf9',
    Gemini:     '#1ecfa0',
    Together:   '#7c6af9',
    Groq:       '#f59e0b',
    Anthropic:  '#da8b6a',
    Custom:     '#8892a4',
  }
  return map[p] || '#8892a4'
}

function statusLabel(s: string) {
  if (s === 'active')       return 'Active'
  if (s === 'rate-limited') return 'Limited'
  if (s === 'idle')         return 'Idle'
  return 'Error'
}

function pillClass(s: string) {
  if (s === 'active')       return 'pill-active'
  if (s === 'rate-limited') return 'pill-limited'
  if (s === 'idle')         return 'pill-idle'
  return 'pill-error'
}

function healthClass(pct: number) {
  if (pct >= 85) return 'health-danger'
  if (pct >= 60) return 'health-warn'
  return 'health-ok'
}

function shortModel(m: string) {
  if (m.includes('/')) return m.split('/').pop()!
  return m.length > 18 ? m.slice(0, 18) + '…' : m
}

function formatTok(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function basename(p: string) {
  return p.replace(/\\/g, '/').split('/').pop() || p
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const budgetClass = computed(() => {
  const pct = store.contextPercent
  if (pct >= 85) return 'danger'
  if (pct >= 60) return 'warning'
  return 'ok'
})

function sendCompact() {
  invoke('pty_write', { data: '/compact\r' }).catch(() => {})
}

async function sendChat() {
  const msg = chatInput.value.trim()
  if (!msg || store.chatLoading) return
  chatInput.value = ''
  store.addChatMessage({ role: 'user', content: msg, timestamp: Date.now() })
  store.chatLoading = true

  await nextTick()
  chatEl.value?.scrollTo({ top: chatEl.value.scrollHeight, behavior: 'smooth' })

  try {
    const res = await fetch('http://127.0.0.1:14201/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer chat' },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        max_tokens: 1024,
        messages: store.chatMessages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role, content: m.content }))
      })
    })
    const data = await res.json()
    const reply = data?.content?.[0]?.text || data?.choices?.[0]?.message?.content || '[No response]'
    store.addChatMessage({ role: 'assistant', content: reply, timestamp: Date.now() })
  } catch (e) {
    store.addChatMessage({ role: 'assistant', content: `Error: ${e}`, timestamp: Date.now() })
  } finally {
    store.chatLoading = false
    await nextTick()
    chatEl.value?.scrollTo({ top: chatEl.value.scrollHeight, behavior: 'smooth' })
  }
}
</script>

<style scoped>
.dashboard-panel {
  width: 100%;
  height: 100%;
  background: var(--bg-surface-1);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ━━━ Tab bar ━━━ */
.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  padding: 0 4px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 4px;
  height: 36px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.02em;
}
.tab-btn:hover { color: var(--text-secondary); }
.tab-btn.active {
  color: var(--accent-blue);
  border-bottom-color: var(--accent-blue);
}

.tab-icon-svg {
  opacity: 0.8;
}

/* ━━━ Tab content ━━━ */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  min-height: 0;
}

/* ━━━ Section labels ━━━ */
.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.section-count {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  background: var(--bg-surface-3);
  border: 1px solid var(--border-subtle);
  padding: 0 5px;
  border-radius: 8px;
}

/* ━━━ Stat chips ━━━ */
.stat-chips {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.stat-chip {
  flex: 1;
  background: var(--bg-surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1;
}
.stat-value.accent-teal { color: var(--accent-teal); }

.stat-label {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

/* ━━━ Key cards ━━━ */
.key-list { display: flex; flex-direction: column; gap: 8px; }

.key-card {
  background: var(--bg-surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 10px 10px 8px;
  position: relative;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.card-active {
  border-color: rgba(79, 156, 249, 0.3);
  box-shadow: 0 0 0 1px rgba(79, 156, 249, 0.08) inset;
}
.card-rate-limited { border-color: rgba(245, 158, 11, 0.3); }
.card-idle         { border-color: var(--border-subtle); }
.card-error        { border-color: rgba(239, 68, 68, 0.3); }

@keyframes card-flash {
  0%   { box-shadow: 0 0 0 2px rgba(79,156,249,0.5); }
  50%  { box-shadow: 0 0 12px rgba(79,156,249,0.4), 0 0 0 2px rgba(79,156,249,0.6); }
  100% { box-shadow: none; }
}
.card-flash { animation: card-flash 0.6s ease; }

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.provider-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.provider-name {
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex: 1;
}

/* Status pills */
.status-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.62rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.pill-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.pill-active {
  color: var(--accent-teal);
  background: rgba(30, 207, 160, 0.12);
}
@keyframes pulse-active {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.pill-active .pill-dot { animation: pulse-active 2s ease-in-out infinite; }

.pill-limited {
  color: var(--accent-amber);
  background: rgba(245, 158, 11, 0.12);
}

.pill-idle {
  color: var(--text-muted);
  background: rgba(255,255,255,0.05);
}

.pill-error {
  color: var(--accent-red);
  background: rgba(239, 68, 68, 0.12);
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.12s;
  flex-shrink: 0;
}
.remove-btn:hover { color: var(--accent-red); background: rgba(239,68,68,0.1); }

.key-label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-primary);
  margin-bottom: 7px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Health bar */
.health-bar-track {
  height: 3px;
  background: var(--bg-surface-3);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}
.health-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}
.health-ok      { background: var(--accent-teal); }
.health-warn    { background: var(--accent-amber); }
.health-danger  { background: var(--accent-red); }

.card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
}
.meta-item {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--text-muted);
}
.meta-sep { color: var(--border-mid); font-size: 0.62rem; }
.model-tag {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-pool {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: center;
  padding: 12px;
  border: 1px dashed var(--border-subtle);
  border-radius: 7px;
}

/* ━━━ Add Key Form ━━━ */
.add-key-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 10px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.form-input {
  background: var(--bg-surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 6px 9px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
  -webkit-appearance: none;
}
.form-input:focus {
  border-color: rgba(79, 156, 249, 0.5);
  box-shadow: 0 0 0 2px rgba(79, 156, 249, 0.08);
}
.form-input option { background: #111520; }

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.15s;
  margin-top: 2px;
}
.add-btn:hover { opacity: 0.88; }

/* ━━━ Context tab ━━━ */
.budget-block {
  background: var(--bg-surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 4px;
}

.budget-numbers {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
}

.budget-used {
  font-family: var(--font-mono);
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1;
}
.budget-used.ok      { color: var(--accent-teal); }
.budget-used.warning { color: var(--accent-amber); }
.budget-used.danger  { color: var(--accent-red); }

.budget-limit {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-muted);
  flex: 1;
}

.budget-pct {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
}
.budget-pct.ok      { color: var(--accent-teal); }
.budget-pct.warning { color: var(--accent-amber); }
.budget-pct.danger  { color: var(--accent-red); }

.budget-track {
  height: 6px;
  background: var(--bg-surface-3);
  border-radius: 3px;
  overflow: hidden;
}
.budget-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease, background 0.3s;
}
.budget-fill.ok      { background: var(--accent-teal); }
.budget-fill.warning { background: var(--accent-amber); }
.budget-fill.danger  { background: var(--accent-red); }

/* Context file lists */
.ctx-empty-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
  padding: 4px 2px;
}

.ctx-file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
}

.ctx-file-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  background: var(--bg-surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  transition: border-color 0.15s;
}
.ctx-file-row:hover { border-color: var(--border-mid); }
.ctx-file-row.available { opacity: 0.7; }
.ctx-file-row.available:hover { opacity: 1; }

.file-icon { color: var(--text-muted); flex-shrink: 0; }

.ctx-fname {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-ftokens {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--accent-teal);
  flex-shrink: 0;
}
.ctx-ftokens.muted { color: var(--text-muted); }

.ctx-remove-btn,
.ctx-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;
}
.ctx-remove-btn { color: var(--text-muted); }
.ctx-remove-btn:hover { color: var(--accent-red); background: rgba(239,68,68,0.1); }
.ctx-add-btn { color: var(--text-muted); border: 1px solid var(--border-subtle); }
.ctx-add-btn:hover { color: var(--accent-teal); border-color: rgba(30,207,160,0.3); }

.compact-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px;
  margin-top: 14px;
  background: none;
  border: 1px solid var(--border-mid);
  border-radius: 8px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.compact-btn:hover {
  border-color: var(--accent-violet);
  color: var(--accent-violet);
  background: rgba(124, 106, 249, 0.06);
}

/* ━━━ Chat tab ━━━ */
.chat-tab {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-meta-label {
  padding: 7px 12px;
  font-size: 0.65rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface-2);
  text-align: center;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.chat-bubble {
  display: flex;
  flex-direction: column;
  max-width: 90%;
}

.chat-bubble.user {
  align-self: flex-end;
  align-items: flex-end;
}

.chat-bubble.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.bubble-body {
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

.chat-bubble.user .bubble-body {
  background: var(--bg-surface-3);
  color: var(--text-primary);
  border-bottom-right-radius: 3px;
}

.chat-bubble.assistant .bubble-body {
  background: var(--bg-surface-1);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  border-bottom-left-radius: 3px;
}

.bubble-time {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  color: var(--text-muted);
  margin-top: 3px;
  padding: 0 3px;
}

.chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  background: var(--bg-surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 0.78rem;
  padding: 8px 10px;
  outline: none;
  resize: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  line-height: 1.5;
}
.chat-input:focus {
  border-color: rgba(79, 156, 249, 0.4);
  box-shadow: 0 0 0 2px rgba(79, 156, 249, 0.07);
}
.chat-input::placeholder { color: var(--text-muted); }

.send-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.send-btn:hover:not(:disabled) { opacity: 0.85; }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>
