<template>
  <div class="workbench-root">
    <!-- Main Chat Workspace -->
    <div class="chat-container">
      <!-- Workbench Header -->
      <header class="workbench-header">
        <div class="header-left">
          <div class="model-status">
            <div class="status-indicator">
              <div class="indicator-core pulse"></div>
              <div class="indicator-ring"></div>
            </div>
            <div class="model-info">
              <span class="model-name">{{ activeModelName }}</span>
              <span class="provider-tag">{{ store.apiKeys[store.activeKeyIndex]?.provider || 'LOCAL_ORCHESTRATOR' }}</span>
            </div>
          </div>
        </div>

        <div class="header-center">
          <div class="session-badge">
            <Activity :size="12" class="icon-glow" />
            <span>SESSION_ACTIVE</span>
          </div>
        </div>

        <div class="header-right">
          <div class="header-actions">
            <button class="action-btn" :class="{ 'active-toggle': showHud }" title="Toggle Interaction HUD" @click="showHud = !showHud">
              <Layout :size="16" />
            </button>
            <div class="header-divider"></div>
            <button class="action-btn" title="Export Thread">
              <Download :size="16" />
            </button>
            <button class="action-btn" title="Clear Session" @click="clearMessages">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </header>

      <!-- Message Stream -->
      <div class="message-stream" ref="streamEl" v-auto-animate>
        <div v-if="store.chatMessages.length === 0" class="empty-state">
          <div class="empty-hero">
            <div class="hero-icon">
              <Cpu :size="48" stroke-width="1" />
            </div>
            <h2 class="hero-title">CARBON_CORE_v2</h2>
            <p class="hero-subtitle">High-frequency AI orchestration shell initialized. Standing by for command input.</p>
            <div class="hero-hints">
              <div class="hint-item"><kbd>/</kbd> Commands</div>
              <div class="hint-item"><kbd>@</kbd> Context</div>
              <div class="hint-item"><kbd>Ctrl+K</kbd> Palette</div>
            </div>
          </div>
        </div>

        <div
          v-for="msg in processedMessages"
          :key="msg.timestamp"
          class="message-group"
          :class="[msg.role, { 'has-reasoning': msg.reasoning }]"
        >
          <div class="message-avatar">
            <div v-if="msg.role === 'user'" class="avatar-box user">
              <User :size="14" />
            </div>
            <div v-else class="avatar-box assistant">
              <Bot :size="14" />
            </div>
          </div>

          <div class="message-content-wrapper">
            <div class="message-meta">
              <span class="meta-role">{{ msg.role.toUpperCase() }}</span>
              <span class="meta-divider"></span>
              <span class="meta-time">{{ formatTime(msg.timestamp) }}</span>
              <span v-if="msg.latency" class="meta-latency">{{ (msg.latency / 1000).toFixed(2) }}s</span>
            </div>

            <!-- Reasoning Block (Expandable) -->
            <div v-if="msg.reasoning" class="reasoning-block">
              <details class="reasoning-details">
                <summary class="reasoning-summary">
                  <BrainCircuit :size="14" />
                  <span>VIEW REASONING PROCESS</span>
                  <ChevronDown :size="14" class="chevron" />
                </summary>
                <div class="reasoning-content" v-html="renderMarkdown(msg.reasoning)"></div>
              </details>
            </div>

            <div class="message-bubble">
              <div v-if="msg.role === 'user'" class="bubble-body raw-text">
                {{ msg.content }}
              </div>
              <div v-else class="bubble-body markdown-rendered" v-html="renderMarkdown(msg.content)"></div>
              
              <!-- Message Actions Overlay -->
              <div class="bubble-actions">
                <button class="mini-action" @click="copyToClipboard(msg.content)" title="Copy content">
                  <Copy :size="12" />
                </button>
                <button v-if="msg.role === 'assistant'" class="mini-action" title="Regenerate">
                  <RefreshCw :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Typing Indicator -->
        <div v-if="store.chatLoading" class="message-group assistant">
          <div class="message-avatar">
            <div class="avatar-box assistant pulse-slow">
              <Bot :size="14" />
            </div>
          </div>
          <div class="message-content-wrapper">
            <div class="typing-indicator-premium">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <span class="typing-label">ANALYZING_CONTEXT</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Deck -->
      <footer class="input-deck">
        <div class="input-glass-container">
          <div class="input-context-crumbs" v-if="store.contextFiles.length > 0">
            <div v-for="file in store.contextFiles.slice(0, 3)" :key="file.path" class="context-pill">
              <FileCode :size="10" />
              <span>{{ file.path.split('/').pop() }}</span>
            </div>
            <span v-if="store.contextFiles.length > 3" class="context-more">+{{ store.contextFiles.length - 3 }}</span>
          </div>

          <div class="input-row">
            <textarea
              v-model="chatInput"
              class="premium-input"
              placeholder="Query Carbon AI or execute project commands..."
              @keydown.enter.exact.prevent="sendChat"
              rows="1"
              ref="inputEl"
              @input="adjustTextarea"
            />
            
            <div class="input-button-group">
              <button class="attach-btn" title="Add Context">
                <Plus :size="18" />
              </button>
              <button 
                class="execute-btn" 
                :disabled="!chatInput.trim() || store.chatLoading" 
                @click="sendChat"
              >
                <span class="btn-text">EXECUTE</span>
                <Zap :size="14" class="btn-icon" />
              </button>
            </div>
          </div>
        </div>
        
        <div class="deck-footer">
          <div class="deck-left">
            <span class="shortcut-tip"><kbd>SHIFT</kbd> + <kbd>ENTER</kbd> FOR NEWLINE</span>
          </div>
          <div class="deck-right">
            <span class="token-limit">CONTEXT {{ store.contextPercent }}%</span>
          </div>
        </div>
      </footer>
    </div>

    <!-- Right Interaction HUD -->
    <aside class="interaction-hud" :class="{ 'hud-visible': showHud }">
      <div class="hud-section">
        <h3 class="hud-title">PERFORMANCE_METRICS</h3>
        <div class="metric-grid">
          <div class="metric-card">
            <span class="metric-label">LATENCY</span>
            <span class="metric-value">{{ store.sessionStats.lastLatency }}ms</span>
            <div class="metric-bar"><div class="bar-fill" :style="{ width: Math.min(100, store.sessionStats.lastLatency / 50) + '%' }"></div></div>
          </div>
          <div class="metric-card">
            <span class="metric-label">TOKENS/S</span>
            <span class="metric-value">42.8</span>
            <div class="metric-bar"><div class="bar-fill blue" style="width: 65%"></div></div>
          </div>
        </div>
      </div>

      <div class="hud-section">
        <h3 class="hud-title">ACTIVE_CONTEXT</h3>
        <div class="context-stats">
          <div class="stat-row">
            <span class="stat-key">TOTAL_TOKENS</span>
            <span class="stat-val">{{ store.contextTokens.toLocaleString() }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-key">FILES_IN_POOL</span>
            <span class="stat-val">{{ store.contextFiles.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-key">LIMIT</span>
            <span class="stat-val">{{ (store.contextLimit / 1000) }}k</span>
          </div>
        </div>
        
        <div class="mini-context-list" v-if="store.contextFiles.length > 0">
          <div v-for="file in store.contextFiles.slice(0, 8)" :key="file.path" class="mini-file">
            <FileText :size="12" />
            <span class="file-name" :title="file.path">{{ file.path.split(/[\\/]/).pop() }}</span>
            <span class="file-size">{{ Math.round(file.tokens / 100) / 10 }}k</span>
            <button class="discard-file-btn" @click="store.removeFromContext(file.path)" title="Remove from context">
              <X :size="10" />
            </button>
          </div>
          <div v-if="store.contextFiles.length > 8" class="more-files">
            AND {{ store.contextFiles.length - 8 }} OTHERS...
          </div>
        </div>
      </div>

      <div class="hud-footer">
        <div class="connection-status">
          <div class="status-dot online"></div>
          <span>API_TUNNEL_STABLE</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAppStore, type ChatMessage } from '../stores/app'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import { 
  Activity, Download, Trash2, Cpu, User, Bot, 
  BrainCircuit, ChevronDown, Copy, RefreshCw, 
  Plus, Zap, FileCode, FileText, X, Layout
} from 'lucide-vue-next'

const store = useAppStore()
const streamEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const chatInput = ref('')
const showHud = ref(window.innerWidth > 1200)

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string): string => {
    let highlighted = ''
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch (__) {}
    } else {
      highlighted = md.utils.escapeHtml(str)
    }

    return `<div class="code-block-wrapper">
      <div class="code-header">
        <span class="code-lang">${lang || 'text'}</span>
        <button class="copy-code-btn" onclick="const p = this.closest('.code-block-wrapper').querySelector('code').innerText; navigator.clipboard.writeText(p); this.classList.add('copied'); setTimeout(() => this.classList.remove('copied'), 2000)">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        </button>
      </div>
      <pre class="hljs"><code>${highlighted}</code></pre>
    </div>`
  }
})

const activeModelName = computed(() => {
  const activeKey = store.apiKeys[store.activeKeyIndex]
  return activeKey ? activeKey.model_id.toUpperCase() : 'NO_MODEL'
})

interface ProcessedMessage extends ChatMessage {
  reasoning?: string
}

// Process messages to extract reasoning
const processedMessages = computed<ProcessedMessage[]>(() => {
  return store.chatMessages.map((msg: ChatMessage) => {
    if (msg.role !== 'assistant') return msg

    let content = msg.content
    let reasoning = ''

    // Detect <thought> or <reasoning> blocks (common in R1/Claude 3.7)
    const thoughtMatch = content.match(/<(?:thought|reasoning)>([\s\S]*?)<\/(?:thought|reasoning)>/i)
    if (thoughtMatch) {
      reasoning = thoughtMatch[1].trim()
      content = content.replace(thoughtMatch[0], '').trim()
    } else {
      // Also check for markdown blocks titled "Thought" or "Reasoning"
      const mdThoughtMatch = content.match(/### Reasoning\n([\s\S]*?)(?:\n###|$)/i)
      if (mdThoughtMatch) {
        reasoning = mdThoughtMatch[1].trim()
        content = content.replace(mdThoughtMatch[0], '').trim()
      }
    }

    return {
      ...msg,
      content,
      reasoning
    }
  })
})

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function renderMarkdown(text: string) {
  return md.render(text)
}

function adjustTextarea() {
  if (!inputEl.value) return
  inputEl.value.style.height = 'auto'
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 300) + 'px'
}

function clearMessages() {
  store.chatMessages = []
  store.sessionStats.lastLatency = 0
  store.sessionStats.tokensUsed = 0
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

async function sendChat() {
  const msg = chatInput.value.trim()
  if (!msg || store.chatLoading) return
  
  // Slash commands
  if (msg.startsWith('/')) {
    if (msg === '/clear') {
      clearMessages()
      chatInput.value = ''
      return
    }
  }

  chatInput.value = ''
  if (inputEl.value) inputEl.value.style.height = 'auto'
  
  store.addChatMessage({ role: 'user', content: msg, timestamp: Date.now() })
  store.chatLoading = true

  await nextTick()
  scrollToBottom()

  const startTime = Date.now()
  
  try {
    const response = await fetch('http://127.0.0.1:14201/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer chat' },
      body: JSON.stringify({
        model: store.apiKeys[store.activeKeyIndex]?.model_id || 'claude-3-7-sonnet',
        messages: store.chatMessages.map(m => ({ role: m.role, content: m.content })),
        stream: true
      })
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    if (!response.body) throw new Error('No response body')

    // Create placeholder for streaming response
    const assistantMsgIndex = store.chatMessages.length
    store.addChatMessage({ 
      role: 'assistant', 
      content: '', 
      timestamp: Date.now(),
      latency: 0
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          if (line.includes('[DONE]')) continue
          try {
            const data = JSON.parse(line.slice(6))
            const delta = data.choices?.[0]?.delta?.content || data.content?.[0]?.text || ''
            fullContent += delta
            store.chatMessages[assistantMsgIndex].content = fullContent
            
            // Auto-scroll while streaming if we are near bottom
            scrollToBottom()
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }

    const latency = Date.now() - startTime
    store.sessionStats.lastLatency = latency
    store.chatMessages[assistantMsgIndex].latency = latency

  } catch (err) {
    store.addChatMessage({ role: 'assistant', content: `CRITICAL ERROR: ${err}`, timestamp: Date.now() })
  } finally {
    store.chatLoading = false
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (streamEl.value) {
    streamEl.value.scrollTo({ top: streamEl.value.scrollHeight, behavior: 'smooth' })
  }
}

onMounted(() => {
  scrollToBottom()
  inputEl.value?.focus()
})
</script>

<style scoped lang="scss">
.workbench-root {
  width: 100%;
  height: 100%;
  display: flex;
  background: var(--bg-base);
  overflow: hidden;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  border-right: 1px solid var(--border-subtle);
}

// ── HEADER ──
.workbench-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: rgba(var(--bg-surface-1-rgb), 0.5);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 10;
}

.model-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  position: relative;
  width: 12px;
  height: 12px;
}

.indicator-core {
  width: 100%;
  height: 100%;
  background: var(--accent-blue);
  border-radius: 50%;
  box-shadow: 0 0 12px var(--accent-blue);
}

.indicator-ring {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 1px solid rgba(79, 156, 249, 0.2);
  border-radius: 50%;
  animation: ring-pulse 4s infinite linear;
}

@keyframes ring-pulse {
  0% { transform: scale(1); opacity: 0; }
  50% { opacity: 0.5; }
  100% { transform: scale(1.5); opacity: 0; }
}

.model-info {
  display: flex;
  flex-direction: column;
}

.model-name {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.05em;
}

.provider-tag {
  font-size: 0.6rem;
  color: var(--text-muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.session-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--accent-teal);
  letter-spacing: 0.1em;
}

.icon-glow {
  filter: drop-shadow(0 0 4px currentColor);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    border-color: var(--border-subtle);
  }
}

// ── STREAM ──
.message-stream {
  flex: 1;
  overflow-y: auto;
  padding: 40px 10%;
  display: flex;
  flex-direction: column;
  gap: 48px;
  background-image: 
    radial-gradient(circle at 50% 0%, rgba(79, 156, 249, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 0% 100%, rgba(124, 106, 249, 0.02) 0%, transparent 40%);
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-hero {
  max-width: 400px;
}

.hero-icon {
  margin-bottom: 24px;
  color: var(--accent-blue);
  opacity: 0.8;
  display: inline-block;
  padding: 20px;
  background: radial-gradient(circle, rgba(79, 156, 249, 0.1) 0%, transparent 70%);
}

.hero-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  letter-spacing: 0.2em;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.hero-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 32px;
}

.hero-hints {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.hint-item {
  font-size: 0.7rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;

  kbd {
    background: var(--bg-surface-2);
    border: 1px solid var(--border-subtle);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text-secondary);
  }
}

// ── MESSAGES ──
.message-group {
  display: flex;
  gap: 20px;
  max-width: 100%;
  position: relative;

  &.user {
    flex-direction: row-reverse;
    .message-content-wrapper { align-items: flex-end; }
    .message-bubble { 
      background: rgba(79, 156, 249, 0.05); 
      border-color: rgba(79, 156, 249, 0.15);
      border-radius: 12px 0 12px 12px;
    }
    .meta-role { color: var(--accent-blue); }
  }

  &.assistant {
    .message-bubble {
      background: rgba(255, 255, 255, 0.02);
      border-color: var(--border-subtle);
      border-radius: 0 12px 12px 12px;
    }
  }
}

.avatar-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.user {
    background: linear-gradient(135deg, #4f9cf9 0%, #2b6cb0 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(79, 156, 249, 0.3);
  }

  &.assistant {
    background: var(--bg-surface-3);
    border: 1px solid var(--border-subtle);
    color: var(--accent-teal);
  }
}

.message-content-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
}

.meta-role {
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.meta-divider {
  width: 3px;
  height: 3px;
  background: var(--text-muted);
  border-radius: 50%;
  opacity: 0.5;
}

.meta-time { color: var(--text-muted); }
.meta-latency {
  color: var(--accent-amber);
  background: rgba(245, 158, 11, 0.05);
  padding: 1px 6px;
  border-radius: 4px;
}

.message-bubble {
  padding: 16px 20px;
  border: 1px solid;
  position: relative;
  transition: all 0.3s;
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    .bubble-actions { opacity: 1; }
  }
}

.bubble-body {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-primary);
  word-wrap: break-word;

  &.raw-text { white-space: pre-wrap; }
}

.bubble-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.mini-action {
  width: 24px;
  height: 24px;
  background: var(--bg-surface-3);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-surface-2);
  }
}

// ── REASONING BLOCK ──
.reasoning-block {
  margin-bottom: 12px;
  border-left: 2px solid var(--border-mid);
  padding-left: 16px;
}

.reasoning-details {
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;

  &[open] {
    .chevron { transform: rotate(180deg); }
    .reasoning-summary { border-bottom: 1px solid var(--border-subtle); }
  }
}

.reasoning-summary {
  list-style: none;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  user-select: none;

  &::-webkit-details-marker { display: none; }

  .chevron {
    margin-left: auto;
    transition: transform 0.2s;
    opacity: 0.5;
  }

  span { letter-spacing: 0.05em; }
}

.reasoning-content {
  padding: 14px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.1);
}

// ── INPUT DECK ──
.input-deck {
  padding: 0 40px 32px;
  background: var(--bg-base);
}

.input-glass-container {
  background: rgba(25, 30, 40, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-mid);
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  transition: border-color 0.3s, box-shadow 0.3s;

  &:focus-within {
    border-color: rgba(79, 156, 249, 0.4);
    box-shadow: 0 10px 40px rgba(79, 156, 249, 0.1);
  }
}

.input-context-crumbs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.context-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: rgba(79, 156, 249, 0.1);
  border: 1px solid rgba(79, 156, 249, 0.2);
  border-radius: 4px;
  color: var(--accent-blue);
  font-size: 0.65rem;
  font-family: var(--font-mono);
}

.input-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.premium-input {
  flex: 1;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  padding: 8px 0;
  max-height: 300px;
  font-family: var(--font-ui);

  &::placeholder { color: var(--text-muted); }
}

.input-button-group {
  display: flex;
  gap: 8px;
  padding-bottom: 4px;
}

.attach-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-surface-3);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-surface-2);
    color: var(--text-primary);
  }
}

.execute-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  background: var(--accent-blue);
  color: white;
  border: none;
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(79, 156, 249, 0.4);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
    background: var(--text-muted);
  }
}

.deck-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding: 0 8px;
}

.shortcut-tip {
  font-size: 0.6rem;
  color: var(--text-muted);
  font-weight: 700;
  letter-spacing: 0.05em;

  kbd {
    background: var(--bg-surface-2);
    padding: 1px 4px;
    border-radius: 3px;
  }
}

.token-limit {
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

// ── HUD ──
.interaction-hud {
  width: 280px;
  background: var(--bg-surface-1);
  border-left: none; // Already handled by parent border
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
}

.hud-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hud-title {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 0.15em;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 8px;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 0.55rem;
  font-weight: 700;
  color: var(--text-muted);
}

.metric-value {
  font-size: 0.85rem;
  font-family: var(--font-mono);
  font-weight: 800;
  color: var(--text-primary);
}

.metric-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.bar-fill {
  height: 100%;
  background: var(--accent-amber);
  width: 0%;
  transition: width 0.5s ease-out;

  &.blue { background: var(--accent-blue); }
}

.context-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px;
  border-radius: 8px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  font-family: var(--font-mono);
}

.stat-key { color: var(--text-muted); }
.stat-val { color: var(--text-secondary); }

.mini-context-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mini-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--border-subtle);
  }

  .file-name {
    flex: 1;
    font-size: 0.7rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-size {
    font-size: 0.6rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }
}

.discard-file-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0;

  &:hover {
    color: var(--accent-red);
    background: rgba(239, 68, 68, 0.1);
  }
}

.mini-file:hover .discard-file-btn {
  opacity: 1;
}

.more-files {
  font-size: 0.6rem;
  color: var(--text-muted);
  text-align: center;
  margin-top: 4px;
  font-weight: 700;
}

.hud-footer {
  margin-top: auto;
  padding-top: 24px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  &.online {
    background: var(--accent-teal);
    box-shadow: 0 0 6px var(--accent-teal);
  }
}

// ── MARKDOWN & CODE ──
:deep(.markdown-rendered) {
  p { margin-bottom: 12px; &:last-child { margin-bottom: 0; } }
  ul, ol { margin-bottom: 12px; padding-left: 20px; }
  li { margin-bottom: 4px; }
  
  .code-block-wrapper {
    margin: 16px 0;
    background: #0d1117;
    border-radius: 12px;
    border: 1px solid var(--border-subtle);
    overflow: hidden;
  }

  .code-header {
    background: rgba(255, 255, 255, 0.03);
    padding: 8px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
  }

  .code-lang {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    text-transform: uppercase;
    font-weight: 800;
  }

  .copy-code-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.05); }
    &.copied { color: var(--accent-teal); }
  }

  pre {
    margin: 0;
    padding: 16px;
    overflow-x: auto;
    font-size: 0.85rem;
    scrollbar-width: thin;
  }
}

// ── CUSTOM UTILS ──
.pulse-slow {
  animation: pulse-slow 2s infinite ease-in-out;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.typing-indicator-premium {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 0 12px 12px 12px;
  width: fit-content;
}

.typing-dot {
  width: 4px;
  height: 4px;
  background: var(--accent-blue);
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes typing-bounce {
  0%, 100% { transform: translateY(0); opacity: 0.3; }
  50% { transform: translateY(-4px); opacity: 1; }
}

.typing-label {
  font-size: 0.65rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  margin-left: 8px;
}
</style>
.header-divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
  margin: 0 4px;
}

.action-btn.active-toggle {
  color: var(--accent-blue);
  background: rgba(79, 156, 249, 0.1);
  border-color: rgba(79, 156, 249, 0.2);
}

// ── RESPONSIVE OVERRIDES ──
@media (max-width: 1200px) {
  .interaction-hud {
    position: absolute;
    right: -320px;
    height: 100%;
    z-index: 100;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    background: var(--bg-surface-1);
    backdrop-filter: blur(20px);
    
    &.hud-visible {
      transform: translateX(-320px);
    }
  }

  .chat-container {
    border-right: none;
  }
}

@media (max-width: 800px) {
  .message-stream {
    padding: 30px 5%;
  }

  .workbench-header {
    padding: 0 16px;
  }

  .header-center {
    display: none; // Hide session badge on small screens
  }
}

@media (max-width: 600px) {
  .avatar-box {
    width: 28px;
    height: 28px;
  }
  
  .message-group {
    gap: 12px;
  }
  
  .execute-btn .btn-text {
    display: none;
  }
  
  .execute-btn {
    padding: 8px 12px;
  }
}
