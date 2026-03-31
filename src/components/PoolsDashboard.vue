<template>
  <div class="pools-dashboard-overlay" @click.self="$emit('close')">
    <div class="dashboard-container">
      <!-- Header Area -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="title-group">
            <h1 class="dashboard-title">Pools & Model Orchestration</h1>
            <p class="dashboard-subtitle">Manage multi-provider API keys and real-time token throughput.</p>
          </div>

          <div class="header-actions">
            <div class="global-stat">
              <span class="stat-label">AGGREGATE TPM</span>
              <span class="stat-value">{{ formatTok(store.totalTpm) }}</span>
            </div>
            <button class="reset-dash-btn" title="Reset Pool to Defaults" @click="store.seedDummyData()">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                <path d="M13 8a5 5 0 10-5 5m5-5h-3m3 0V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="add-provider-btn" @click="showAddForm = !showAddForm">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Add Provider
            </button>
          </div>
        </div>
      </div>

      <!-- Main Grid Area -->
      <div class="dashboard-grid" v-auto-animate>
        <!-- Add Card (Expanded Cinematic Form) -->
        <div v-if="showAddForm" class="provider-card add-form-expanded">
          <div class="add-form-left">
            <div class="card-header">
              <span class="card-title">Register New Logic Engine</span>
              <button class="close-card-btn" @click="showAddForm = false">×</button>
            </div>
            <div class="add-form-body">
              <div class="form-row">
                <label>Provider Chassis</label>
                <select v-model="newKey.provider">
                  <option>Anthropic</option>
                  <option>OpenAI</option>
                  <option>Gemini</option>
                  <option>Groq</option>
                  <option>OpenRouter</option>
                </select>
              </div>
              <div class="form-row">
                <label>Identifier Label</label>
                <input type="text" v-model="newKey.label" placeholder="e.g. Primary Research" />
              </div>
              <div class="form-row">
                <label>API Auth Key</label>
                <input type="password" v-model="newKey.key" placeholder="sk-..." />
              </div>
              <div class="form-row">
                <label>Model selection</label>
                <input type="text" v-model="newKey.model" placeholder="anthropic/claude-3-7-sonnet" />
                <div class="model-presets">
                  <button class="preset-chip" @click="newKey.model = 'claude-3-7-sonnet'">C3.7</button>
                  <button class="preset-chip" @click="newKey.model = 'o3-mini'">O3M</button>
                  <button class="preset-chip" @click="newKey.model = 'gemini-2.0-flash'">GF2</button>
                  <button class="preset-chip" @click="newKey.model = 'llama3-70b-8192'">L3.7</button>
                </div>
              </div>
              <button class="submit-key-btn" :class="{ 'is-loading': isDeploying }" @click="addKey">
                {{ isDeploying ? deployStatus : 'DECODE & DEPLOY' }}
              </button>
            </div>
          </div>

          <div class="add-form-preview" :class="{ 'processing-flash': isDeploying }">
            <span class="preview-label">LIVE PREVIEW</span>
            <!-- Preview of the card -->
            <div class="provider-card preview-internal">
              <div v-if="isDeploying" class="deploy-overlay">
                <div class="matrix-text">{{ deployStatus }}</div>
              </div>

              <div class="card-top">
                <div class="provider-info">
                  <div class="provider-badge" :class="newKey.provider.toLowerCase()">{{ newKey.provider[0] }}</div>
                  <div class="provider-meta">
                    <span class="provider-name">{{ newKey.label || 'New Engine' }}</span>
                    <span class="provider-status active">STAGING</span>
                  </div>
                </div>
              </div>
              <div class="usage-lines">
                <div class="usage-line-group">
                  <div class="usage-label-row"><span>TPM</span><span>0 / 100k</span></div>
                  <div class="usage-bar-track"><div class="usage-bar-fill blue" style="width: 2%"></div></div>
                </div>
                <div class="usage-line-group">
                  <div class="usage-label-row"><span>RPM</span><span>0 / 50</span></div>
                  <div class="usage-bar-track"><div class="usage-bar-fill teal" style="width: 2%"></div></div>
                </div>
              </div>
              <div class="card-footer">
                <div class="model-tag">{{ newKey.model || 'no-model-selected' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Provider Cards -->
        <div 
          v-for="(key, idx) in store.apiKeys" 
          :key="key.id" 
          class="provider-card"
          :class="{ 'is-active': idx === store.activeKeyIndex }"
        >
          <div class="card-top">
            <div class="provider-info">
              <div class="provider-badge" :class="key.provider.toLowerCase()">{{ key.provider[0] }}</div>
              <div class="provider-meta">
                <span class="provider-name">{{ key.label }}</span>
                <span class="provider-status" :class="key.status">{{ key.status.toUpperCase() }}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="card-icon-btn" title="Rotate Key" @click="store.rotateKey(idx)">
                <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
                  <path d="M12 7c0 2.76-2.24 5-5 5S2 9.76 2 7s2.24-5 5-5c1.1 0 2.12.36 2.94.96" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  <path d="M11 1.5v3M11 4.5h-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
              </button>
              <button class="card-icon-btn danger" title="Remove" @click="store.removeApiKey(key.id)">
                <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Usage Lines (Requested progress bars) -->
          <div class="usage-lines">
            <div class="usage-line-group">
              <div class="usage-label-row">
                <span>TPM (Tokens per min)</span>
                <span>{{ formatTok(key.tpm) }} / {{ formatTok(key.tpmLimit) }}</span>
              </div>
              <div class="usage-bar-track">
                <div class="usage-bar-fill blue" :style="{ width: (key.tpm / key.tpmLimit * 100) + '%' }"></div>
              </div>
            </div>
            <div class="usage-line-group">
              <div class="usage-label-row">
                <span>RPM (Req per min)</span>
                <span>{{ key.rpm }} / {{ key.rpmLimit }}</span>
              </div>
              <div class="usage-bar-track">
                <div class="usage-bar-fill teal" :style="{ width: (key.rpm / key.rpmLimit * 100) + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Live Telemetry Sparkline -->
          <div class="card-telemetry">
            <LineChart :data="getMockChartData(idx)" :options="chartOptions" />
          </div>

          <div class="card-footer">
            <div class="model-tag">
              <svg viewBox="0 0 10 10" width="8" height="8" fill="currentColor">
                <circle cx="5" cy="5" r="3" />
              </svg>
              {{ key.model_id }}
            </div>
            <div class="key-id-mask">•••• {{ key.id.slice(-4) }}</div>
          </div>
        </div>
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
defineEmits(['close'])

import { onMounted } from 'vue'
onMounted(() => {
  // If only 0 or 1 key exists (likely from stale persistence), force seed 6 dummies
  if (store.apiKeys.length < 2) {
    store.seedDummyData()
  }
})

const showAddForm = ref(false)
const newKey = ref({
  provider: 'OpenRouter',
  label: '',
  key: '',
  model: 'anthropic/claude-3-7-sonnet'
})

const isDeploying = ref(false)
const deployStatus = ref('CONNECTING...')

async function addKey() {
  if (!newKey.value.key || isDeploying.value) return
  
  isDeploying.value = true
  const statuses = ['DECRYPTING...', 'VALIDATING NODE...', 'SYNCING BUFFER...', 'LINKED']
  
  for (const s of statuses) {
    deployStatus.value = s
    await new Promise(r => setTimeout(r, 500))
  }

  store.addApiKey({
    provider: newKey.value.provider,
    label: newKey.value.label || newKey.value.provider,
    key: newKey.value.key,
    model_id: newKey.value.model
  })
  
  newKey.value.key = ''
  newKey.value.label = ''
  isDeploying.value = false
  showAddForm.value = false
}

function formatTok(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false }
  },
  scales: {
    x: { display: false },
    y: { display: false, min: 0 }
  },
  elements: {
    point: { radius: 0 }
  }
}

function getMockChartData(seed: number) {
  // Generate slightly different curves for each card
  const base = [300, 400, 350, 800, 1200, 900, 1100, 1500, 1800, 2100]
  const data = base.map(v => v + (Math.sin(seed + v) * 200))
  
  return {
    labels: base.map((_, i) => i.toString()),
    datasets: [
      {
        borderColor: '#4f9cf9',
        borderWidth: 1.5,
        fill: true,
        backgroundColor: 'rgba(79, 156, 249, 0.05)',
        tension: 0.4,
        data: data
      }
    ]
  }
}
</script>

<style scoped>
.pools-dashboard-overlay {
  width: 100%;
  height: 100%;
  background: rgba(9, 11, 16, 0.15); /* High translucency */
  backdrop-filter: blur(54px); /* Extreme blur */
  -webkit-backdrop-filter: blur(54px);
  z-index: 10;
  display: flex;
  justify-content: center;
  overflow-y: auto;
  padding: 40px;
  position: relative;
}

/* Subtle Tactical Scanning Line */
.pools-dashboard-overlay::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(79, 156, 249, 0.15), transparent);
  animation: scan-vertical 8s linear infinite;
  pointer-events: none;
}

@keyframes scan-vertical {
  0% { top: 0; }
  100% { top: 100%; }
}

.dashboard-container {
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Header */
.dashboard-header {
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.dashboard-title {
  font-family: var(--font-heading);
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(to right, #fff, #8892a4);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dashboard-subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 6px 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}

.global-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--accent-blue);
}

.reset-dash-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.reset-dash-btn:hover {
  background: var(--bg-surface-3);
  color: var(--accent-amber);
  border-color: rgba(245, 158, 11, 0.3);
}

.add-provider-btn {
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.add-provider-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(79, 156, 249, 0.3);
}

/* Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  padding-bottom: 40px;
}

/* Card Base */
.provider-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.provider-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.provider-card.is-active {
  border-color: rgba(79, 156, 249, 0.4);
  background: rgba(79, 156, 249, 0.02);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.provider-info {
  display: flex;
  gap: 12px;
}

.provider-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-family: var(--font-heading);
  background: #1e2535;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}
.provider-badge.anthropic { background: #d97757; }
.provider-badge.openrouter { background: #7c6af9; }
.provider-badge.openai     { background: #10a37f; }

.provider-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.provider-status {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.provider-status.active { color: var(--accent-teal); }
.provider-status.idle { color: var(--text-muted); }

.card-actions {
  display: flex;
  gap: 6px;
}

.card-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.card-icon-btn:hover:not(.danger) { background: var(--bg-surface-3); color: var(--text-primary); }
.card-icon-btn.danger:hover { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); border-color: rgba(239, 68, 68, 0.2); }

/* Usage Lines */
.usage-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-line-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.usage-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.usage-bar-track {
  height: 4px;
  background: rgba(255,255,255,0.05);
  border-radius: 2px;
  overflow: hidden;
}

.usage-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 1s ease;
}
.usage-bar-fill.blue { background: var(--accent-blue); box-shadow: 0 0 10px rgba(79,156,249,0.3); }
.usage-bar-fill.teal { background: var(--accent-teal); box-shadow: 0 0 10px rgba(30,207,160,0.3); }

/* Sparkline */
.card-telemetry {
  height: 40px;
  width: 100%;
  margin-top: 4px;
}

.card-footer {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-tag {
  font-size: 0.68rem;
  font-family: var(--font-mono);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.key-id-mask {
  font-size: 0.6rem;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}

/* Add Form Expanded Card */
.add-form-expanded {
  grid-column: span 2;
  background: rgba(79, 156, 249, 0.05);
  border: 1px dashed rgba(79, 156, 249, 0.3);
  display: flex !important;
  flex-direction: row !important;
  gap: 32px;
  padding: 32px;
}

@media (max-width: 800px) {
  .add-form-expanded { grid-column: span 1; flex-direction: column !important; }
  .header-content { flex-direction: column; align-items: flex-start; gap: 20px; }
  .header-actions { width: 100%; justify-content: flex-start; gap: 16px; }
}

@media (max-width: 600px) {
  .pools-dashboard-overlay { padding: 20px; }
  .dashboard-title { font-size: 1.4rem; }
  .dashboard-grid { grid-template-columns: 1fr; }
  .add-form-preview { display: none; }
}

.add-form-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.add-form-preview {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-label {
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--accent-blue);
  letter-spacing: 0.2em;
  text-align: center;
}

.preview-internal {
  background: rgba(0,0,0,0.3) !important;
  pointer-events: none;
  opacity: 0.8;
  border-style: solid !important;
}

.model-presets {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.preset-chip {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 0.6rem;
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-chip:hover {
  background: var(--bg-surface-3);
  color: var(--text-primary);
  border-color: var(--accent-blue);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--accent-blue);
}

.close-card-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
}

.add-form-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.form-row input, .form-row select {
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  padding: 8px 12px;
  color: white;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-row input:focus {
  border-color: var(--accent-blue);
}

.submit-key-btn {
  margin-top: 8px;
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px;
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.submit-key-btn.is-loading {
  background: var(--bg-surface-3);
  color: var(--accent-blue);
  cursor: wait;
  animation: pulse-border 1s infinite alternate;
}

@keyframes pulse-border {
  from { box-shadow: 0 0 5px rgba(79, 156, 249, 0.2); }
  to { box-shadow: 0 0 15px rgba(79, 156, 249, 0.5); }
}

.deploy-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(9, 11, 16, 0.8);
  z-index: 10;
  backdrop-filter: blur(4px);
}

.matrix-text {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--accent-blue);
  letter-spacing: 0.1em;
  text-shadow: 0 0 10px rgba(79, 156, 249, 0.8);
  animation: flicker 0.2s infinite alternate;
}

@keyframes flicker {
  from { opacity: 0.8; }
  to { opacity: 1; }
}

.processing-flash {
  animation: subtle-flash 2.5s ease-out;
}

@keyframes subtle-flash {
  0% { filter: brightness(1); }
  10% { filter: brightness(1.4) saturate(1.2); }
  100% { filter: brightness(1); }
}
</style>
