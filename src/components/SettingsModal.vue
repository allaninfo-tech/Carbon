<template>
  <div class="cmd-overlay" @click.self="$emit('close')">
    <div class="settings-modal">
      <div class="settings-header">
        <h2>Carbon Settings</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="settings-content">
        <p class="settings-hint">Configure your orchestration engine and appearance.</p>
        
        <div class="setting-group">
          <label>Context Limit Budget</label>
          <input type="number" v-model="store.contextLimit" class="form-input" />
          <span class="setting-help">Triggers /compact automatically at 85% of this limit.</span>
        </div>

        <div class="setting-group">
          <label>Fallback Model ID</label>
          <input type="text" value="meta-llama/llama-3.3-70b-instruct" class="form-input" />
          <span class="setting-help">Default model when proxying without a model field.</span>
        </div>
        
        <!-- More settings could go here -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/app'
const store = useAppStore()
defineEmits(['close'])
</script>

<style scoped>
.cmd-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(15, 17, 26, 0.7);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.settings-modal {
  width: 450px;
  background: #161925;
  border: 1px solid #3b82f6;
  border-radius: 12px;
  display: flex; flex-direction: column;
}
.settings-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #272a38;
}
.settings-header h2 { font-size: 1.1rem; color: #e0e6ed; font-weight: 600; margin: 0; }
.close-btn { background: none; border: none; color: #8b949e; cursor: pointer; font-size: 16px; }
.close-btn:hover { color: #da3633; }
.settings-content { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.settings-hint { color: #8b949e; font-size: 0.85rem; margin-bottom: 8px; }
.setting-group { display: flex; flex-direction: column; gap: 6px; }
.setting-group label { font-size: 0.82rem; font-weight: 600; color: #e0e6ed; }
.setting-help { font-size: 0.75rem; color: #4b5563; }
.form-input {
  background: #1e2233;
  border: 1px solid #272a38;
  border-radius: 6px;
  color: #e0e6ed;
  padding: 8px 12px;
  outline: none;
  font-family: inherit;
}
.form-input:focus { border-color: #3b82f6; }
</style>
