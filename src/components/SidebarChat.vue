<template>
  <div class="sidebar-view">
    <div class="sidebar-header">
      <span class="sidebar-title">Chat & Context</span>
    </div>

    <div class="sidebar-content">
      <!-- Chat Tab (Combined) -->
      <div class="chat-meta-label">Direct chat — does not share coding context</div>

      <div class="chat-messages" ref="chatEl" v-auto-animate>
        <div v-if="store.chatMessages.length === 0" class="chat-empty">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" class="empty-icon-svg">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" stroke-width="1.2" fill="none"/>
            <path d="M10 9h6M10 13h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          <span class="empty-title">Deep Space Assistant</span>
          <p class="empty-subtitle">Direct model communication.</p>
          <div class="quick-actions">
            <button class="qa-chip" @click="chatInput = 'Summarize my active context.'; sendChat()">Summarize Context</button>
            <button class="qa-chip" @click="chatInput = 'Check for security flaws.'; sendChat()">Security Audit</button>
            <button class="qa-chip" @click="chatInput = 'Suggest performance optimizations.'; sendChat()">Optimize</button>
          </div>
        </div>
        <div
          v-for="msg in store.chatMessages"
          :key="msg.timestamp"
          class="chat-bubble"
          :class="msg.role"
        >
          <div v-if="msg.role === 'user'" class="bubble-body">{{ msg.content }}</div>
          <div v-else class="bubble-body markdown-rendered" v-html="renderMarkdown(msg.content)"></div>
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
import { ref, nextTick } from 'vue'
import { useAppStore } from '../stores/app'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

const store = useAppStore()
const chatEl = ref<HTMLElement | null>(null)
const chatInput = ref('')

const md = new MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; // use external default escaping
  }
})

function renderMarkdown(text: string) {
  return md.render(text)
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
.sidebar-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  height: 36px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.chat-meta-label {
  padding: 7px 12px;
  font-size: 0.65rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface-3);
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
  gap: 8px;
  height: 100%;
  color: var(--text-muted);
  font-size: 0.78rem;
  text-align: center;
}

.empty-icon-svg { margin-bottom: 4px; color: var(--text-secondary); opacity: 0.8; }
.empty-title { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
.empty-subtitle { font-size: 0.75rem; max-width: 80%; line-height: 1.4; margin-bottom: 8px; }

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}

.qa-chip {
  background: var(--bg-surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 0.68rem;
  padding: 5px 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.qa-chip:hover {
  background: rgba(79,156,249,0.1);
  border-color: rgba(79,156,249,0.3);
  color: var(--accent-blue);
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
  background: var(--bg-surface-1);
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

/* Markdown Styles */
:deep(.markdown-rendered) {
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--text-primary);
}
:deep(.markdown-rendered p) { margin: 6px 0; }
:deep(.markdown-rendered p:first-child) { margin-top: 0; }
:deep(.markdown-rendered p:last-child) { margin-bottom: 0; }
:deep(.markdown-rendered pre) {
  background: var(--bg-surface-2) !important;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 10px;
  overflow-x: auto;
  margin: 8px 0;
}
:deep(.markdown-rendered code) {
  font-family: var(--font-mono);
  font-size: 0.72rem;
}
:deep(.markdown-rendered pre code) {
  background: transparent !important;
  padding: 0;
}
</style>
