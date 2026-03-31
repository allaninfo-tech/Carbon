<template>
  <div class="sidebar-view">
    <div class="sidebar-header">
      <span class="sidebar-title">Pools & Models</span>
    </div>

    <!-- Scrollable content -->
    <div class="sidebar-content">
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

      <!-- Live Telemetry sparkline mock -->
      <div class="telemetry-chart">
        <LineChart :data="chartData" :options="chartOptions" />
      </div>

      <!-- Section label -->
      <div class="section-label">Pool Keys</div>

      <!-- Key cards -->
      <div class="key-list" v-auto-animate>
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Filler
} from 'chart.js'
import { Line as LineChart } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Filler
)

const store = useAppStore()

// Mock telemetry data
const chartData = ref({
  labels: ['-9', '-8', '-7', '-6', '-5', '-4', '-3', '-2', '-1', 'Now'],
  datasets: [
    {
      label: 'TPM',
      backgroundColor: 'rgba(79, 156, 249, 0.1)',
      borderColor: '#4f9cf9',
      borderWidth: 1.5,
      pointRadius: 2,
      pointHoverRadius: 4,
      fill: true,
      tension: 0.4,
      data: [350, 420, 300, 750, 1200, 800, 950, 1500, 1800, 2100]
    }
  ]
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { 
      enabled: true,
      backgroundColor: 'rgba(17, 21, 32, 0.9)',
      titleFont: { family: 'JetBrains Mono', size: 10 },
      bodyFont: { family: 'JetBrains Mono', size: 11 },
      padding: 8,
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1
    }
  },
  scales: {
    x: { display: false },
    y: { display: false, min: 0, suggestedMax: 3000 }
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
}

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
  overflow-y: auto;
  padding: 14px 12px;
}

/* Section labels */
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

/* Stat chips */
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

.telemetry-chart {
  height: 85px;
  width: 100%;
  margin-bottom: 20px;
  padding: 0 4px;
}

/* Key cards */
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

/* Add Key Form */
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
</style>
