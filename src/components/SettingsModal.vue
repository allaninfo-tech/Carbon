<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="settings-modal">
      <!-- Header -->
      <div class="modal-header">
        <div class="modal-title-row">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
            <circle cx="7" cy="7" r="2.2" stroke="var(--accent-blue)" stroke-width="1.2" fill="none"/>
            <path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.4 3.4l.7.7M9.9 9.9l.7.7M3.4 10.6l.7-.7M9.9 4.1l.7-.7" stroke="var(--accent-blue)" stroke-width="1.1" stroke-linecap="round"/>
          </svg>
          <span class="modal-title">Settings</span>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <svg viewBox="0 0 12 12" width="11" height="11" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <div class="settings-section">
          <div class="settings-section-title">Context Management</div>

          <div class="setting-row">
            <div class="setting-info">
              <label class="setting-label">Context Limit (tokens)</label>
              <span class="setting-desc">Triggers /compact automatically when usage hits 85%</span>
            </div>
            <input
              type="number"
              v-model="store.contextLimit"
              class="setting-input"
              min="8000"
              max="2000000"
              step="1000"
            />
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <label class="setting-label">Auto-compact threshold</label>
              <span class="setting-desc">Percentage at which context compaction triggers</span>
            </div>
            <div class="threshold-display">85%</div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Proxy</div>

          <div class="setting-row">
            <div class="setting-info">
              <label class="setting-label">Proxy Port</label>
              <span class="setting-desc">Local proxy listens on this port for Claude Code</span>
            </div>
            <div class="setting-readonly">14201</div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <label class="setting-label">Fallback Model</label>
              <span class="setting-desc">Used when request does not specify a model</span>
            </div>
            <input
              type="text"
              class="setting-input"
              value="llama-3.3-70b"
            />
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Appearance</div>

          <div class="setting-row">
            <div class="setting-info">
              <label class="setting-label">Font Size</label>
              <span class="setting-desc">Terminal font size in pixels</span>
            </div>
            <input type="number" class="setting-input" value="13" min="10" max="20" />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <span class="footer-hint">Changes apply immediately</span>
        <button class="save-btn" @click="$emit('close')">Done</button>
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
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(9,11,16,0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.settings-modal {
  width: 480px;
  background: rgba(17, 21, 32, 0.7);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 30px 60px rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 85vh;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.modal-title {
  font-family: var(--font-heading);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.close-btn:hover {
  color: var(--accent-red);
  border-color: rgba(239,68,68,0.3);
  background: rgba(239,68,68,0.06);
}

/* Body */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Section */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-section-title {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

/* Row */
.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 0.7rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.setting-input {
  background: rgba(9, 11, 16, 0.6);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  padding: 6px 10px;
  outline: none;
  width: 120px;
  flex-shrink: 0;
  transition: border-color 0.15s, box-shadow 0.15s;
  text-align: right;
}
.setting-input:focus {
  border-color: rgba(79,156,249,0.5);
  box-shadow: 0 0 0 2px rgba(79,156,249,0.07);
}

.setting-readonly,
.threshold-display {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--accent-teal);
  background: rgba(30,207,160,0.07);
  border: 1px solid rgba(30,207,160,0.15);
  padding: 5px 10px;
  border-radius: 6px;
  width: 120px;
  text-align: right;
  flex-shrink: 0;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid var(--border-subtle);
  background: rgba(9, 11, 16, 0.3);
  flex-shrink: 0;
}

.footer-hint {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.save-btn {
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 7px 18px;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.save-btn:hover { opacity: 0.85; }
</style>
