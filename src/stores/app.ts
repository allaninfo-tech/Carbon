import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ActivityId = 'explorer' | 'search' | 'git' | 'pool' | 'chat' | 'settings'

export interface ApiKey {
  id: string
  provider: string
  label: string
  key: string
  url: string
  model_id: string
  status: 'active' | 'rate-limited' | 'idle' | 'error'
  requestCount: number
  rpm: number
  rpmLimit: number
  tpm: number
  tpmLimit: number
  usagePercent: number
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
  // ── Activity sidebar ──
  const activeActivity = ref<ActivityId>('explorer')
  const sidebarOpen = ref(true)

  const apiKeys = ref<ApiKey[]>([
    {
      id: 'ant-1',
      provider: 'Anthropic',
      label: 'Claude 3.7 Tier 4',
      key: 'sk-ant-...',
      url: 'https://api.anthropic.com/v1/messages',
      model_id: 'claude-3-7-sonnet',
      status: 'active',
      requestCount: 1420,
      rpm: 12,
      rpmLimit: 50,
      tpm: 8400,
      tpmLimit: 40000,
      usagePercent: 21,
    },
    {
      id: 'oai-1',
      provider: 'OpenAI',
      label: 'GPT-4o Production',
      key: 'sk-oai-...',
      url: 'https://api.openai.com/v1/chat/completions',
      model_id: 'gpt-4o',
      status: 'active',
      requestCount: 850,
      rpm: 4,
      rpmLimit: 100,
      tpm: 12000,
      tpmLimit: 150000,
      usagePercent: 8,
    },
    {
      id: 'gem-1',
      provider: 'Gemini',
      label: 'Gemini 2.0 Flash',
      key: 'sk-gem-...',
      url: 'https://generativelanguage.googleapis.com/v1beta/models',
      model_id: 'gemini-2.0-flash',
      status: 'active',
      requestCount: 3100,
      rpm: 45,
      rpmLimit: 60,
      tpm: 2200,
      tpmLimit: 10000,
      usagePercent: 75,
    },
    {
      id: 'groq-1',
      provider: 'Groq',
      label: 'Llama 3.3 70B (Fast)',
      key: 'sk-groq-...',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model_id: 'llama-3.3-70b-specdec',
      status: 'active',
      requestCount: 42,
      rpm: 1,
      rpmLimit: 30,
      tpm: 500,
      tpmLimit: 5000,
      usagePercent: 10,
    },
    {
      id: 'or-1',
      provider: 'OpenRouter',
      label: 'DeepSeek-V3 Link',
      key: 'sk-or-...',
      url: 'https://openrouter.ai/api/v1/messages',
      model_id: 'deepseek/deepseek-v3',
      status: 'rate-limited',
      requestCount: 12000,
      rpm: 20,
      rpmLimit: 20,
      tpm: 9900,
      tpmLimit: 10000,
      usagePercent: 99,
    },
    {
      id: 'mist-1',
      provider: 'Mistral',
      label: 'Pixtral-12B',
      key: 'sk-mist-...',
      url: 'https://api.mistral.ai/v1/chat/completions',
      model_id: 'pixtral-12b',
      status: 'idle',
      requestCount: 0,
      rpm: 0,
      rpmLimit: 10,
      tpm: 0,
      tpmLimit: 20000,
      usagePercent: 0,
    }
  ])
  const activeKeyIndex = ref(0)
  const flashingKeyId = ref<string | null>(null)

  // ── Context ──
  const contextTokens = ref(0)
  const contextLimit = ref(128000)
  const contextFiles = ref<ContextFile[]>([])
  const availableFiles = ref<ContextFile[]>([])
  const contextPercent = computed(() =>
    Math.min(100, Math.round((contextTokens.value / contextLimit.value) * 100))
  )

  // ── Pool computed ──
  const totalRpm = computed(() => apiKeys.value.reduce((s, k) => s + k.rpm, 0))
  const totalTpm = computed(() => apiKeys.value.reduce((s, k) => s + k.tpm, 0))
  const activeKeyCount = computed(() => apiKeys.value.filter(k => k.status === 'active').length)

  // ── Chat ──
  const chatMessages = ref<ChatMessage[]>([])
  const chatLoading = ref(false)

  // ── Modals ──
  const cmdPaletteOpen = ref(false)
  const settingsOpen = ref(false)

  // ── Project ──
  const projectPath = ref<string>('')
  const gitStats = ref<Record<string, { added: number; deleted: number }>>({})

  // ── Active Context section toggle ──
  const activeTab = ref<'pools' | 'context' | 'chat'>('pools') // Keeping for legacy reference just in case
  const contextSectionOpen = ref(true)

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

  function addApiKey(key: Omit<ApiKey, 'id' | 'status' | 'requestCount' | 'rpm' | 'tpm' | 'usagePercent' | 'rpmLimit' | 'tpmLimit' | 'url'>) {
    const providerUrls: Record<string, string> = {
      'OpenRouter': 'https://openrouter.ai/api/v1/messages',
      'Anthropic': 'https://api.anthropic.com/v1/messages',
      'OpenAI': 'https://api.openai.com/v1/chat/completions',
      'Gemini': 'https://generativelanguage.googleapis.com/v1beta/models',
      'Groq': 'https://api.groq.com/openai/v1/chat/completions'
    }

    apiKeys.value.push({
      ...key,
      id: `key-${Date.now()}`,
      url: providerUrls[key.provider] || '',
      status: 'active',
      requestCount: 0,
      rpm: 0,
      rpmLimit: 10,
      tpm: 0,
      tpmLimit: 100000,
      usagePercent: 0,
    })
  }

  function removeApiKey(id: string) {
    apiKeys.value = apiKeys.value.filter(k => k.id !== id)
  }

  // FORCE DUMMIES if empty (bypasses persistence for this testing phase)
  function seedDummyData() {
    apiKeys.value = [
      { id: 'ant-1', provider: 'Anthropic', label: 'Claude 3.7 Sonnet', key: '...', url: '', model_id: 'claude-3-7-sonnet', status: 'active', requestCount: 1420, rpm: 12, rpmLimit: 50, tpm: 8400, tpmLimit: 40000, usagePercent: 21 },
      { id: 'oai-1', provider: 'OpenAI', label: 'GPT-4o Reasoning', key: '...', url: '', model_id: 'gpt-4o', status: 'active', requestCount: 850, rpm: 4, rpmLimit: 100, tpm: 120000, tpmLimit: 150000, usagePercent: 80 },
      { id: 'gem-1', provider: 'Gemini', label: 'Gemini 2.0 Flash', key: '...', url: '', model_id: 'gemini-2.0-flash', status: 'active', requestCount: 3100, rpm: 55, rpmLimit: 60, tpm: 2200, tpmLimit: 10000, usagePercent: 75 },
      { id: 'groq-1', provider: 'Groq', label: 'Llama 3 70B', key: '...', url: '', model_id: 'llama3-70b-8192', status: 'active', requestCount: 42, rpm: 1, rpmLimit: 30, tpm: 4500, tpmLimit: 5000, usagePercent: 90 },
      { id: 'or-1', provider: 'OpenRouter', label: 'DeepSeek V3', key: '...', url: '', model_id: 'deepseek/deepseek-v3', status: 'rate-limited', requestCount: 12000, rpm: 20, rpmLimit: 20, tpm: 9950, tpmLimit: 10000, usagePercent: 99 },
      { id: 'mist-1', provider: 'Mistral', label: 'Mistral Large', key: '...', url: '', model_id: 'mistral-large-latest', status: 'idle', requestCount: 0, rpm: 0, rpmLimit: 10, tpm: 0, tpmLimit: 20000, usagePercent: 2 }
    ]
  }

  function rotateKey(index?: number) {
    const prevIndex = activeKeyIndex.value
    const prevKey = apiKeys.value[prevIndex]
    
    if (typeof index === 'number' && index >= 0 && index < apiKeys.value.length) {
      activeKeyIndex.value = index
    } else {
      activeKeyIndex.value = (activeKeyIndex.value + 1) % apiKeys.value.length
    }

    const nextKey = apiKeys.value[activeKeyIndex.value]

    if (prevKey) {
      flashingKeyId.value = prevKey.id
      setTimeout(() => {
        if (nextKey) flashingKeyId.value = nextKey.id
        setTimeout(() => { flashingKeyId.value = null }, 600)
      }, 400)
    }
  }

  function addToContext(file: ContextFile) {
    if (!contextFiles.value.find(f => f.path === file.path)) {
      contextFiles.value.push(file)
      availableFiles.value = availableFiles.value.filter(f => f.path !== file.path)
    }
  }

  function removeFromContext(path: string) {
    const file = contextFiles.value.find(f => f.path === path)
    contextFiles.value = contextFiles.value.filter(f => f.path !== path)
    if (file) availableFiles.value.unshift(file)
  }

  return {
    activeActivity,
    sidebarOpen,
    apiKeys,
    activeKeyIndex,
    flashingKeyId,
    contextTokens,
    contextLimit,
    contextFiles,
    availableFiles,
    contextPercent,
    totalRpm,
    totalTpm,
    activeKeyCount,
    chatMessages,
    chatLoading,
    cmdPaletteOpen,
    settingsOpen,
    projectPath,
    gitStats,
    activeTab,
    contextSectionOpen,
    setContextTokens,
    updateGitStats,
    addChatMessage,
    setProjectPath,
    markKeyState,
    addApiKey,
    removeApiKey,
    seedDummyData, // Exported
    rotateKey,
    addToContext,
    removeFromContext,
  }
}, {
  persist: {
    pick: ['apiKeys', 'activeKeyIndex', 'contextLimit', 'projectPath', 'activeActivity', 'sidebarOpen']
  }
} as any)
