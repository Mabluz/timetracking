<template>
  <div class="chart-container">
    <svg :width="width" :height="height" class="bar-chart">
      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- Y-axis -->
        <g class="axis y-axis">
          <line :y2="chartHeight" stroke="#dee2e6" stroke-width="1" />
          <g v-for="(tick, index) in yTicks" :key="index">
            <line :y1="yScale(tick)" :y2="yScale(tick)" :x2="chartWidth" stroke="#f8f9fa" stroke-width="1" />
            <text :y="yScale(tick)" dy="0.32em" x="-6" text-anchor="end" class="tick-label">
              {{ formatValue(tick) }}
            </text>
          </g>
        </g>
        
        <!-- X-axis -->
        <g class="axis x-axis" :transform="`translate(0, ${chartHeight})`">
          <line :x2="chartWidth" stroke="#dee2e6" stroke-width="1" />
          <g v-for="(item, index) in data" :key="index">
            <text 
              :x="xScale(item.label) + xScale.bandwidth() / 2" 
              y="15" 
              text-anchor="middle" 
              class="tick-label"
            >
              {{ item.label }}
            </text>
          </g>
        </g>
        
        <!-- Bars -->
        <g class="bars">
          <rect
            v-for="(item, index) in data"
            :key="index"
            :x="xScale(item.label)"
            :y="yScale(item.value)"
            :width="xScale.bandwidth()"
            :height="chartHeight - yScale(item.value)"
            :fill="item.color || '#007bff'"
            class="bar"
            @mouseover="showTooltip($event, item)"
            @mouseout="hideTooltip"
          />
        </g>
      </g>
    </svg>
    
    <!-- Tooltip -->
    <div 
      v-if="tooltip.visible" 
      class="tooltip" 
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <strong>{{ tooltip.data.label }}</strong><br>
      {{ formatValue(tooltip.data.value) }}{{ valueSuffix }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface BarChartData {
  label: string
  value: number
  color?: string
}

interface Props {
  data: BarChartData[]
  width?: number
  height?: number
  valueSuffix?: string
  formatValue?: (value: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 400,
  valueSuffix: '',
  formatValue: (value: number) => value.toString()
})

const margin = { top: 20, right: 30, bottom: 40, left: 60 }
const chartWidth = computed(() => props.width - margin.left - margin.right)
const chartHeight = computed(() => props.height - margin.top - margin.bottom)

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  data: { label: '', value: 0 }
})

const maxValue = computed(() => Math.max(...props.data.map(d => d.value)))

const yScale = computed(() => {
  const max = maxValue.value * 1.1 // Add 10% padding
  return (value: number) => chartHeight.value - (value / max) * chartHeight.value
})

const yTicks = computed(() => {
  const max = maxValue.value * 1.1
  const tickCount = 5
  const step = max / tickCount
  return Array.from({ length: tickCount + 1 }, (_, i) => i * step)
})

const xScale = computed(() => {
  const bandwidth = chartWidth.value / props.data.length * 0.8
  const padding = chartWidth.value / props.data.length * 0.1
  
  const scale = (label: string) => {
    const index = props.data.findIndex(d => d.label === label)
    return index * (chartWidth.value / props.data.length) + padding
  }
  
  scale.bandwidth = () => bandwidth
  return scale
})

const showTooltip = (event: MouseEvent, data: BarChartData) => {
  tooltip.value = {
    visible: true,
    x: event.clientX + 10,
    y: event.clientY - 10,
    data
  }
}

const hideTooltip = () => {
  tooltip.value.visible = false
}
</script>

<style scoped>
.chart-container {
  position: relative;
  display: inline-block;
}

.bar-chart {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.bar {
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.bar:hover {
  opacity: 0.8;
}

.tick-label {
  font-size: 12px;
  fill: #6c757d;
}

.tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  max-width: 200px;
}
</style>