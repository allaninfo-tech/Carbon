<template>
  <div class="file-tree-item">
    <div
      class="file-row"
      :class="{ active: isExpanded && item.isDir }"
      :style="{ paddingLeft: depth * 14 + 8 + 'px' }"
      @click="toggle"
    >
      <span class="file-icon">
        <span v-if="item.isDir">{{ isExpanded ? '▾' : '▸' }}</span>
        <span v-else>·</span>
      </span>
      <span class="file-name" :class="{ dir: item.isDir }">{{ item.name }}</span>
      <span v-if="stat" class="git-stat">
        <span v-if="stat.added" class="add">+{{ stat.added }}</span>
        <span v-if="stat.deleted" class="del">-{{ stat.deleted }}</span>
      </span>
    </div>
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

const stat = computed(() => {
  // Normalize path separators
  const normalPath = props.item.path.replace(/\\/g, '/')
  return props.gitStats[normalPath] || null
})

function toggle() {
  if (props.item.isDir) isExpanded.value = !isExpanded.value
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
  min-height: 24px;
}
.file-row:hover { background: #1e2233; }
.file-row.active { background: #1e2233; }

.file-icon {
  font-size: 11px;
  color: #4b5563;
  width: 12px;
  text-align: center;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  font-size: 0.8rem;
  color: #8b949e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-name.dir { color: #e0e6ed; font-weight: 500; }

.git-stat {
  display: flex;
  gap: 4px;
  font-size: 0.7rem;
  font-family: 'Cascadia Code', monospace;
  flex-shrink: 0;
}
.git-stat .add { color: #2ea043; }
.git-stat .del { color: #da3633; }
</style>
