import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ApiKey {
  id: string
  provider: string
  label: string
  key: string
  url: string
  model_id: string
  status: 'active' | 'rate-limited' | 'error'
  requestCount: number
}

export interface ContextFile {
  path: string
  tokens: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export const useAppStore = defineStore('app', () => {
  // --- API Pool ---
  const apiKeys = ref<ApiKey[]>([
    {
      id: 'openrouter-1',
      provider: 'OpenRouter',
      label: 'openrouter-key-1',
      key: '',
      url: 'https://openrouter.ai/api/v1/messages',
      model_id: 'meta-llama/llama-3.3-70b-instruct',
      status: 'active',
      requestCount: 0,
    }
  ])
  const activeKeyIndex = ref(0)

  // --- Context ---
  const contextTokens = ref(0)
  const contextLimit = ref(128000)
  const contextFiles = ref<ContextFile[]>([])
  const contextPercent = computed(() =>
    Math.round((contextTokens.value / contextLimit.value) * 100)
  )

  // --- Chat ---
  const chatMessages = ref<ChatMessage[]>([])
  const chatLoading = ref(false)

  // --- Modals ---
  const cmdPaletteOpen = ref(false)
  const settingsOpen = ref(false)

  // --- Project ---
  const projectPath = ref<string>('')
  const gitStats = ref<Record<string, { added: number; deleted: number }>>({})

  // --- Dashboard tab state ---
  const activeTab = ref<'pools' | 'context' | 'chat'>('pools')

  function setContextTokens(n: number) {
    contextTokens.value = n
  }

  function updateGitStats(stats: Record<string, { added: number; deleted: number }>) {
    gitStats.value = stats
  }

  function addChatMessage(msg: ChatMessage) {
    chatMessages.value.push(msg)
  }

  function setProjectPath(path: string) {
    projectPath.value = path
  }

  function markKeyState(index: number, status: ApiKey['status']) {
    if (apiKeys.value[index]) {
      apiKeys.value[index].status = status
    }
  }

  function addApiKey(key: Omit<ApiKey, 'id' | 'status' | 'requestCount'>) {
    apiKeys.value.push({
      ...key,
      id: `key-${Date.now()}`,
      status: 'active',
      requestCount: 0,
    })
  }

  function removeApiKey(id: string) {
    apiKeys.value = apiKeys.value.filter(k => k.id !== id)
  }

  function rotateKey() {
    activeKeyIndex.value = (activeKeyIndex.value + 1) % apiKeys.value.length
  }

  return {
    apiKeys,
    activeKeyIndex,
    contextTokens,
    contextLimit,
    contextFiles,
    contextPercent,
    chatMessages,
    chatLoading,
    cmdPaletteOpen,
    settingsOpen,
    projectPath,
    gitStats,
    activeTab,
    setContextTokens,
    updateGitStats,
    addChatMessage,
    setProjectPath,
    markKeyState,
    addApiKey,
    removeApiKey,
    rotateKey,
  }
})
