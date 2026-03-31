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
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- Pools Tab -->
    <div v-if="store.activeTab === 'pools'" class="tab-content">
      <div class="section-label">API Pool</div>
      <div class="key-list">
        <div v-for="(key, idx) in store.apiKeys" :key="key.id" class="key-card" :class="key.status">
          <div class="key-header">
            <span class="provider-badge">{{ key.provider }}</span>
            <span class="key-status-dot" :title="key.status" />
          </div>
          <div class="key-label">{{ key.label }}</div>
          <div class="key-meta">{{ key.requestCount }} reqs • {{ key.model_id }}</div>
          <button class="remove-btn" @click="store.removeApiKey(key.id)" title="Remove">✕</button>
        </div>
      </div>

      <div class="section-label" style="margin-top:16px">Add Key</div>
      <div class="add-key-form">
        <select v-model="newKey.provider" class="form-input">
          <option value="OpenRouter">OpenRouter</option>
          <option value="Gemini">Gemini</option>
          <option value="Together">Together AI</option>
          <option value="Groq">Groq</option>
          <option value="Custom">Custom</option>
        </select>
        <input v-model="newKey.label" class="form-input" placeholder="Label (e.g. gemini-key-1)" />
        <input v-model="newKey.key" class="form-input" type="password" placeholder="API Key" />
        <input v-model="newKey.url" class="form-input" placeholder="Endpoint URL" />
        <select v-model="newKey.model_id" class="form-input">
          <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B (128k ctx)</option>
          <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (2M ctx)</option>
          <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (200k ctx)</option>
        </select>
        <button class="add-btn" @click="addKey">＋ Add to Pool</button>
      </div>
    </div>

    <!-- Context Tab -->
    <div v-if="store.activeTab === 'context'" class="tab-content">
      <div class="section-label">Token Budget</div>
      <div class="budget-display">
        <div class="budget-numbers">
          <span :class="['budget-used', budgetClass]">{{ formatNum(store.contextTokens) }}</span>
          <span class="budget-sep">/ {{ formatNum(store.contextLimit) }}</span>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill" :class="budgetClass" :style="{ width: store.contextPercent + '%' }" />
        </div>
        <div class="budget-pct" :class="budgetClass">{{ store.contextPercent }}% used</div>
      </div>

      <div class="section-label" style="margin-top:16px">Active Context Files</div>
      <div v-if="store.contextFiles.length === 0" class="empty-hint">
        No files in context
      </div>
      <div v-else class="context-file-list">
        <div v-for="f in store.contextFiles" :key="f.path" class="context-file">
          <span class="ctx-file-name">{{ basename(f.path) }}</span>
          <span class="ctx-file-tokens">{{ formatNum(f.tokens) }} tok</span>
        </div>
      </div>
    </div>

    <!-- Chat Tab -->
    <div v-if="store.activeTab === 'chat'" class="tab-content chat-tab">
      <div class="chat-messages" ref="chatEl">
        <div v-if="store.chatMessages.length === 0" class="empty-hint">
          Chat with the AI here.<br>This session is isolated from your coding context.
        </div>
        <div
          v-for="msg in store.chatMessages"
          :key="msg.timestamp"
          class="chat-msg"
          :class="msg.role"
        >
          <span class="msg-role">{{ msg.role === 'user' ? 'You' : 'AI' }}</span>
          <div class="msg-content">{{ msg.content }}</div>
        </div>
      </div>

      <div class="chat-input-row">
        <textarea
          v-model="chatInput"
          class="chat-input"
          placeholder="Ask anything..."
          rows="2"
          @keydown.enter.exact.prevent="sendChat"
        />
        <button class="send-btn" :disabled="store.chatLoading" @click="sendChat">
          {{ store.chatLoading ? '…' : '↑' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const chatEl = ref<HTMLElement | null>(null)
const chatInput = ref('')

const tabs = [
  { id: 'pools', label: 'Pools', icon: '⚡' },
  { id: 'context', label: 'Context', icon: '📦' },
  { id: 'chat', label: 'Chat', icon: '💬' },
]

const newKey = ref({
  provider: 'OpenRouter',
  label: '',
  key: '',
  url: 'https://openrouter.ai/api/v1/messages',
  model_id: 'meta-llama/llama-3.3-70b-instruct'
})

const budgetClass = computed(() => {
  const pct = store.contextPercent
  if (pct >= 85) return 'danger'
  if (pct >= 60) return 'warning'
  return 'ok'
})

function formatNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function basename(p: string) {
  return p.replace(/\\/g, '/').split('/').pop() || p
}

function addKey() {
  if (!newKey.value.key || !newKey.value.label) return
  store.addApiKey({ ...newKey.value })
  newKey.value = { provider: 'OpenRouter', label: '', key: '', url: 'https://openrouter.ai/api/v1/messages', model_id: 'meta-llama/llama-3.3-70b-instruct' }
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
    // POST through local proxy with isolated chat context
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
  width: 320px;
  min-width: 250px;
  max-width: 450px;
  background: #161925;
  border-left: 1px solid #272a38;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid #272a38;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 10px 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-bottom: 2px solid transparent;
}
.tab-btn:hover { color: #8b949e; }
.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-icon { font-size: 13px; }

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #4b5563;
  margin-bottom: 10px;
}

/* Pool key cards */
.key-list { display: flex; flex-direction: column; gap: 8px; }

.key-card {
  background: #1e2233;
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid #272a38;
  position: relative;
  transition: border-color 0.2s;
}
.key-card.active { border-color: #2ea043; }
.key-card.rate-limited { border-color: #f59e0b; }
.key-card.error { border-color: #da3633; }

.key-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }

.provider-badge {
  font-size: 0.7rem;
  font-weight: 700;
  background: #272a38;
  padding: 2px 8px;
  border-radius: 4px;
  color: #8b949e;
}

.key-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ea043;
  flex-shrink: 0;
}
.key-card.rate-limited .key-status-dot { background: #f59e0b; }
.key-card.error .key-status-dot { background: #da3633; }

.key-label { font-size: 0.8rem; color: #e0e6ed; font-family: 'Cascadia Code', monospace; }
.key-meta { font-size: 0.7rem; color: #4b5563; margin-top: 2px; }

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #4b5563;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.15s;
}
.remove-btn:hover { color: #da3633; background: rgba(218,54,51,0.1); }

/* Add key form */
.add-key-form { display: flex; flex-direction: column; gap: 8px; }

.form-input {
  background: #1e2233;
  border: 1px solid #272a38;
  border-radius: 6px;
  color: #e0e6ed;
  font-size: 0.8rem;
  padding: 7px 10px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.form-input:focus { border-color: #3b82f6; }

.add-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.add-btn:hover { background: #2563eb; }

/* Budget */
.budget-display { background: #1e2233; border-radius: 8px; padding: 12px; }
.budget-numbers { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.budget-used { font-size: 1.5rem; font-weight: 700; font-family: 'Cascadia Code', monospace; }
.budget-used.ok { color: #2ea043; }
.budget-used.warning { color: #f59e0b; }
.budget-used.danger { color: #da3633; }
.budget-sep { font-size: 0.85rem; color: #4b5563; }
.budget-bar-track { height: 6px; background: #272a38; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.budget-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s, background 0.3s; }
.budget-bar-fill.ok { background: #2ea043; }
.budget-bar-fill.warning { background: #f59e0b; }
.budget-bar-fill.danger { background: #da3633; }
.budget-pct { font-size: 0.75rem; text-align: right; }
.budget-pct.ok { color: #2ea043; }
.budget-pct.warning { color: #f59e0b; }
.budget-pct.danger { color: #da3633; }

.empty-hint { font-size: 0.8rem; color: #4b5563; line-height: 1.6; }
.context-file-list { display: flex; flex-direction: column; gap: 4px; }
.context-file {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 4px 8px;
  background: #1e2233;
  border-radius: 5px;
}
.ctx-file-name { color: #8b949e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ctx-file-tokens { color: #4b5563; font-family: 'Cascadia Code', monospace; flex-shrink: 0; }

/* Chat */
.chat-tab { display: flex; flex-direction: column; padding: 0; height: 100%; }
.chat-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.chat-msg { display: flex; flex-direction: column; gap: 4px; }
.msg-role { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.chat-msg.user .msg-role { color: #3b82f6; }
.chat-msg.assistant .msg-role { color: #a855f7; }
.msg-content { font-size: 0.82rem; color: #e0e6ed; line-height: 1.5; white-space: pre-wrap; }
.chat-input-row {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #272a38;
  flex-shrink: 0;
}
.chat-input {
  flex: 1;
  background: #1e2233;
  border: 1px solid #272a38;
  border-radius: 8px;
  color: #e0e6ed;
  font-size: 0.82rem;
  padding: 8px 10px;
  outline: none;
  resize: none;
  font-family: inherit;
  transition: border-color 0.15s;
}
.chat-input:focus { border-color: #3b82f6; }
.send-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  width: 36px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}
.send-btn:hover:not(:disabled) { background: #2563eb; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
