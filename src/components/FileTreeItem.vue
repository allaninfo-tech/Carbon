<template>
  <div class="file-tree-item">
    <div
      class="file-row"
      :class="{ 'is-dir-open': item.isDir && isExpanded }"
      :style="{ paddingLeft: depth * 12 + 8 + 'px' }"
      @click="toggle"
    >
      <!-- Expand/collapse arrow or file dot -->
      <span class="file-icon">
        <Folder v-if="item.isDir" :size="14" class="icon-folder" />
        <File v-else :size="14" class="icon-file" />
      </span>

      <!-- Name -->
      <span class="file-name" :class="{ 'is-dir': item.isDir }">{{ item.name }}</span>

      <!-- Git stat badge -->
      <span v-if="stat" class="git-stat">
        <span v-if="stat.added" class="git-add">+{{ stat.added }}</span>
        <span v-if="stat.deleted" class="git-del">-{{ stat.deleted }}</span>
      </span>

      <!-- Add to Context button (hover) -->
      <button v-if="!item.isDir" class="add-ctx-btn" @click.stop="addContext" title="Add to Context">
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
          <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Children (recursion) -->
    <template v-if="item.isDir && isExpanded && item.children">
      <FileTreeItem
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :git-stats="gitStats"
        :depth="depth + 1"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import { Folder, File } from 'lucide-vue-next'

interface FileEntry {
  name: string
  path: string
  isDir: boolean
  children?: FileEntry[]
}

const props = withDefaults(defineProps<{
  item: FileEntry
  gitStats: Record<string, { added: number; deleted: number }>
  depth?: number
}>(), { depth: 0 })

const isExpanded = ref(false)
const store = useAppStore()

const stat = computed(() => {
  const normalPath = props.item.path.replace(/\\/g, '/')
  return props.gitStats[normalPath] || null
})

function toggle() {
  if (props.item.isDir) isExpanded.value = !isExpanded.value
}

function addContext() {
  // Approximate standard token count for the UI mock
  const simTokens = Math.floor(Math.random() * 800) + 100
  store.addToContext({ path: props.item.path, tokens: simTokens })
}
</script>

<style scoped>
.file-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
  min-height: 22px;
  margin: 0 4px;
  position: relative;
}
.file-row:hover { background: var(--bg-surface-2); }
.file-row.is-dir-open { background: rgba(79,156,249,0.04); }

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  flex-shrink: 0;
}

.icon-folder {
  color: #f59e0b; /* Amber */
  filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.2));
}

.icon-file {
  color: #8892a4; /* Muted Blue-Grey */
}

.file-name {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name.is-dir {
  color: var(--text-primary);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.git-stat {
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  flex-shrink: 0;
}

.git-add { color: var(--accent-teal); }
.git-del { color: var(--accent-red); }

.add-ctx-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--bg-surface-3);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.1s;
}
.file-row:hover .add-ctx-btn {
  display: flex;
}
.add-ctx-btn:hover {
  color: var(--accent-blue);
  border-color: rgba(79,156,249,0.3);
  background: rgba(79,156,249,0.1);
}
</style>
