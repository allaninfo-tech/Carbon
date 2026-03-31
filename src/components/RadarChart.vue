<template>
  <div class="radar-container">
    <svg viewBox="0 0 100 100" class="radar-svg">
      <!-- Background Grid -->
      <circle cx="50" cy="50" r="40" class="grid-line" />
      <circle cx="50" cy="50" r="20" class="grid-line" />
      <line x1="50" y1="10" x2="50" y2="90" class="grid-line" />
      <line x1="10" y1="50" x2="90" y2="50" class="grid-line" />

      <!-- Data Shape -->
      <polygon :points="points" class="data-shape" />
      
      <!-- Label Points -->
      <circle v-for="p in pointCoords" :cx="p.x" :cy="p.y" r="1.5" class="data-point" />
    </svg>
    <div class="radar-labels">
      <span class="label top">COD</span>
      <span class="label right">SPD</span>
      <span class="label bottom">CST</span>
      <span class="label left">RSN</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  stats: {
    coding: number
    reasoning: number
    speed: number
    cost: number
  }
}>(), {
  stats: () => ({ coding: 50, reasoning: 50, speed: 50, cost: 50 })
})

const pointCoords = computed(() => {
  const center = 50
  const scale = 0.4 // 40px max radius
  
  return [
    { x: center, y: center - (props.stats.coding * scale) },     // Top
    { x: center + (props.stats.speed * scale), y: center },      // Right
    { x: center, y: center + (props.stats.cost * scale) },       // Bottom
    { x: center - (props.stats.reasoning * scale), y: center },  // Left
  ]
})

const points = computed(() => {
  return pointCoords.value.map(p => `${p.x},${p.y}`).join(' ')
})
</script>

<style scoped>
.radar-container {
  width: 80px;
  height: 80px;
  position: relative;
}

.radar-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 4px rgba(79, 156, 249, 0.2));
}

.grid-line {
  fill: none;
  stroke: rgba(255, 255, 255, 0.05);
  stroke-width: 0.5;
}

.data-shape {
  fill: rgba(79, 156, 249, 0.15);
  stroke: var(--accent-blue);
  stroke-width: 1.5;
  stroke-linejoin: round;
  transition: all 0.5s ease;
}

.data-point {
  fill: var(--accent-blue);
  filter: blur(0.5px);
}

.radar-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.label {
  position: absolute;
  font-size: 0.5rem;
  font-weight: 800;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.label.top    { top: 0; left: 50%; transform: translateX(-50%); }
.label.right  { top: 50%; right: 0; transform: translateY(-50%); }
.label.bottom { bottom: 0; left: 50%; transform: translateX(-50%); }
.label.left   { top: 50%; left: 0; transform: translateY(-50%); }
</style>
