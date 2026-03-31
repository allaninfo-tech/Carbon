<template>
  <div class="explorer-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-indicator"></div>
      <span class="header-title">CARBON_FS_v2.4</span>
      <div class="header-actions">
        <button class="header-btn" title="Open project folder" @click="openFolder">
          <FolderPlus :size="14" />
        </button>
      </div>
    </div>

    <!-- File tree -->
    <div class="panel-content">
      <div v-if="!store.projectPath" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <rect x="2" y="8" width="36" height="27" rx="3" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/>
            <path d="M2 14h36" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
            <path d="M2 11a3 3 0 013-3h7l3 3H35a3 3 0 013 3v18a3 3 0 01-3 3H5a3 3 0 01-3-3V11z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </div>
        <p class="empty-label">No project open</p>
        <button class="open-btn" @click="openFolder">Open Folder</button>
      </div>

      <div v-else class="file-tree">
        <div class="project-name">
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" class="project-icon">
            <circle cx="6" cy="6" r="5" stroke="var(--accent-teal)" stroke-width="1.2" fill="none"/>
            <circle cx="6" cy="6" r="2" fill="var(--accent-teal)"/>
          </svg>
          {{ projectName }}
        </div>
        <FileTreeItem
          v-for="item in fileTree"
          :key="item.path"
          :item="item"
          :git-stats="store.gitStats"
        />
      </div>
    </div>

    <!-- Active Context Section -->
    <div class="context-section">
      <button class="context-section-header" @click="store.contextSectionOpen = !store.contextSectionOpen">
        <svg class="collapse-arrow" :class="{ open: store.contextSectionOpen }" viewBox="0 0 12 12" width="10" height="10" fill="none">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="section-title">Active Context</span>
        <span class="context-chip-count">{{ store.contextFiles.length }}</span>
      </button>

      <div v-if="store.contextSectionOpen" class="context-chips">
        <div v-if="store.contextFiles.length === 0" class="ctx-empty">
          No files in memory
        </div>
        <div v-for="f in store.contextFiles" :key="f.path" class="ctx-chip">
          <span class="ctx-chip-name">{{ basename(f.path) }}</span>
          <span class="ctx-chip-tokens">{{ formatTok(f.tokens) }}</span>
          <button class="ctx-chip-remove" @click="store.removeFromContext(f.path)" title="Remove from context">
            <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Context chart -->
      <div v-if="store.contextSectionOpen" class="ctx-chart-wrapper">
        <div class="ctx-chart-container">
          <Doughnut :data="chartData" :options="chartOptions" />
          <div class="ctx-chart-center">
            <span class="ctx-center-val" :class="contextClass">{{ store.contextPercent }}%</span>
            <span class="ctx-center-lbl">USED</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useAppStore } from '../stores/app'
import FileTreeItem from './FileTreeItem.vue'
import { FolderPlus } from 'lucide-vue-next'
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'

ChartJS.register(ArcElement, ChartTooltip)

const store = useAppStore()

interface FileEntry {
  name: string
  path: string
  isDir: boolean
  children?: FileEntry[]
}

const fileTree = ref<FileEntry[]>([])

const projectName = computed(() => {
  const p = store.projectPath
  if (!p) return ''
  return p.replace(/\\/g, '/').split('/').pop() || p
})

const contextClass = computed(() => {
  const pct = store.contextPercent
  if (pct >= 85) return 'danger'
  if (pct >= 60) return 'warning'
  return 'ok'
})

const chartData = computed(() => {
  const cTheme = 
    contextClass.value === 'danger' ? '#ef4444' :
    contextClass.value === 'warning' ? '#f59e0b' : '#1ecfa0';
    
  return {
    labels: ['Used', 'Available'],
    datasets: [
      {
        backgroundColor: [cTheme, 'rgba(255,255,255,0.04)'],
        borderColor: ['transparent', 'transparent'],
        data: [store.contextTokens, Math.max(0, store.contextLimit - store.contextTokens)],
        hoverOffset: 0,
        cutout: '78%'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(17, 21, 32, 0.9)',
      titleFont: { family: 'Inter', size: 10 },
      bodyFont: { family: 'JetBrains Mono', size: 11 },
      padding: 8,
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      displayColors: false
    }
  },
  animation: {
    animateScale: true,
    animateRotate: true
  }
}

function formatTok(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function basename(p: string) {
  return p.replace(/\\/g, '/').split('/').pop() || p
}

async function openFolder() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Project Root'
  })
  
  if (selected && typeof selected === 'string') {
    store.setProjectPath(selected)
    await loadFileTree(selected)
    refreshGitStats()
  }
}

async function loadFileTree(dir: string) {
  try {
    const result = await invoke<FileEntry[]>('list_dir', { path: dir })
    fileTree.value = result
  } catch {
    fileTree.value = []
  }
}

async function refreshGitStats() {
  try {
    const stats = await invoke<Record<string, { added: number; deleted: number }>>('get_git_stats', {
      cwd: store.projectPath
    })
    store.updateGitStats(stats)
  } catch {}
}

onMounted(() => {
  if (store.projectPath) {
    loadFileTree(store.projectPath)
    refreshGitStats()
  }
  setInterval(refreshGitStats, 5000)
})
</script>

<style scoped>
.explorer-panel {
  width: 100%;
  height: 100%;
  background: rgba(var(--bg-surface-1-rgb), 0.7);
  backdrop-filter: blur(24px);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 48px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.header-indicator {
  width: 3px;
  height: 14px;
  background: var(--accent-blue);
  border-radius: 4px;
  box-shadow: 0 0 8px var(--accent-blue);
}

.header-title {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--text-primary);
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    color: var(--accent-blue);
    border-color: rgba(79, 156, 249, 0.3);
    background: rgba(79, 156, 249, 0.05);
  }
}

/* Content */
.panel-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
  padding: 24px 16px;
  text-align: center;
}

.empty-icon { color: var(--text-muted); }
.empty-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.open-btn {
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.open-btn:hover { opacity: 0.85; }

/* File tree */
.file-tree { padding: 6px 0; }

.project-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 4px 12px 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.project-icon { flex-shrink: 0; }

/* ━━━ Active Context Section ━━━ */
.context-section {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-1);
  flex-shrink: 0;
}

.context-section-header {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.15s;
}
.context-section-header:hover { color: var(--text-secondary); }

.collapse-arrow {
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.collapse-arrow.open { transform: rotate(0deg); }
.collapse-arrow:not(.open) { transform: rotate(-90deg); }

.section-title {
  font-size: 0.67rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  flex: 1;
  text-align: left;
}

.context-chip-count {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  background: var(--bg-surface-3);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 1px 6px;
  border-radius: 10px;
}

/* Context chips */
.context-chips {
  padding: 0 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 140px;
  overflow-y: auto;
}

.ctx-empty {
  font-size: 0.72rem;
  color: var(--text-muted);
  padding: 2px 2px 4px;
  font-style: italic;
}

.ctx-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 5px;
  padding: 4px 8px;
  transition: border-color 0.15s;
}
.ctx-chip:hover { border-color: var(--border-mid); }

.ctx-chip-name {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-chip-tokens {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--accent-teal);
  flex-shrink: 0;
}

.ctx-chip-remove {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 3px;
  transition: all 0.12s;
  flex-shrink: 0;
}
.ctx-chip-remove:hover { color: var(--accent-red); background: rgba(239,68,68,0.1); }

/* Context chart replacing bar */
.ctx-chart-wrapper {
  padding: 12px 16px 16px;
  display: flex;
  justify-content: center;
}

.ctx-chart-container {
  position: relative;
  width: 110px;
  height: 110px;
}

.ctx-chart-center {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.ctx-center-val {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1;
}
.ctx-center-val.ok      { color: var(--accent-teal); }
.ctx-center-val.warning { color: var(--accent-amber); }
.ctx-center-val.danger  { color: var(--accent-red); }

.ctx-center-lbl {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
