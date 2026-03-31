<template>
  <div class="explorer-panel">
    <div class="panel-header">
      <span class="header-icon">📁</span>
      <span>Explorer</span>
      <button class="header-btn" title="Open project folder" @click="openFolder">+</button>
    </div>

    <div class="panel-content">
      <div v-if="!store.projectPath" class="empty-state">
        <div class="empty-icon">📂</div>
        <p>No project open</p>
        <button class="open-btn" @click="openFolder">Open Folder</button>
      </div>

      <div v-else class="file-tree">
        <div class="project-name">{{ projectName }}</div>
        <FileTreeItem
          v-for="item in fileTree"
          :key="item.path"
          :item="item"
          :git-stats="store.gitStats"
        />
      </div>
    </div>

    <!-- Context budget mini bar -->
    <div class="context-footer">
      <div class="context-label">
        <span>Context</span>
        <span :class="['context-pct', contextClass]">{{ store.contextPercent }}%</span>
      </div>
      <div class="context-bar-track">
        <div
          class="context-bar-fill"
          :style="{ width: store.contextPercent + '%' }"
          :class="contextClass"
        />
      </div>
      <div class="context-numbers">
        {{ formatNum(store.contextTokens) }} / {{ formatNum(store.contextLimit) }} tok
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-opener'
import { useAppStore } from '../stores/app'
import FileTreeItem from './FileTreeItem.vue'

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

function formatNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

async function openFolder() {
  try {
    // Use Tauri dialog to pick a folder (plugin-dialog if available, else prompt)
    // For now we use a simple prompt as dialog plugin may not be installed
    const path = prompt('Enter project path:')
    if (!path) return
    store.setProjectPath(path)
    await loadFileTree(path)
    refreshGitStats()
  } catch (e) {
    console.error('openFolder error', e)
  }
}

async function loadFileTree(dir: string) {
  try {
    const result = await invoke<FileEntry[]>('list_dir', { path: dir })
    fileTree.value = result
  } catch {
    // Fallback: show a placeholder - list_dir not yet implemented
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
  // Poll git stats every 5s
  setInterval(refreshGitStats, 5000)
})
</script>

<style scoped>
.explorer-panel {
  width: 280px;
  min-width: 200px;
  max-width: 400px;
  background: #161925;
  border-right: 1px solid #272a38;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8b949e;
  border-bottom: 1px solid #272a38;
  flex-shrink: 0;
}

.header-icon { font-size: 13px; }

.header-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #4b5563;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}
.header-btn:hover { color: #e0e6ed; background: #272a38; }

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #4b5563;
  padding: 32px 16px;
  text-align: center;
}

.empty-icon { font-size: 36px; }

.open-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.open-btn:hover { background: #2563eb; }

.project-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #e0e6ed;
  padding: 6px 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Context footer */
.context-footer {
  padding: 12px 14px;
  border-top: 1px solid #272a38;
  flex-shrink: 0;
}

.context-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: #8b949e;
  margin-bottom: 6px;
}

.context-pct.ok { color: #2ea043; }
.context-pct.warning { color: #f59e0b; }
.context-pct.danger { color: #da3633; }

.context-bar-track {
  height: 4px;
  background: #272a38;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.context-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease, background 0.3s;
}
.context-bar-fill.ok { background: #2ea043; }
.context-bar-fill.warning { background: #f59e0b; }
.context-bar-fill.danger { background: #da3633; }

.context-numbers {
  font-size: 0.7rem;
  color: #4b5563;
  text-align: right;
  font-family: 'Cascadia Code', monospace;
}
</style>
