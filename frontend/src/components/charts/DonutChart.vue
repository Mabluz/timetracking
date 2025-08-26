<template>
  <div class="chart-container">
    <svg :width="width" :height="height" class="donut-chart">
      <g :transform="`translate(${width / 2}, ${height / 2})`">
        <!-- Donut segments -->
        <path
          v-for="(segment, index) in segments"
          :key="index"
          :d="segment.path"
          :fill="segment.color"
          class="segment"
          @mouseover="showTooltip($event, segment.data)"
          @mouseout="hideTooltip"
        />
        
        <!-- Center text -->
        <text class="center-text-primary" text-anchor="middle" dy="-0.5em">
          {{ centerPrimary }}
        </text>
        <text class="center-text-secondary" text-anchor="middle" dy="1em">
          {{ centerSecondary }}
        </text>
      </g>
    </svg>
    
    <!-- Legend -->
    <div class="legend">
      <div 
        v-for="(item, index) in data" 
        :key="index" 
        class="legend-item"
      >
        <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
        <span class="legend-label">{{ item.label }}</span>
        <span class="legend-value">{{ formatValue(item.value) }}{{ valueSuffix }}</span>
      </div>
    </div>
    
    <!-- Tooltip -->
    <div 
      v-if="tooltip.visible" 
      class="tooltip" 
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <strong>{{ tooltip.data.label }}</strong><br>
      {{ formatValue(tooltip.data.value) }}{{ valueSuffix }}<br>
      <span class="percentage">{{ tooltip.data.percentage.toFixed(1) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface DonutChartData {
  label: string
  value: number
  color: string
}

interface Props {
  data: DonutChartData[]
  width?: number
  height?: number
  innerRadius?: number
  outerRadius?: number
  valueSuffix?: string
  centerPrimary?: string
  centerSecondary?: string
  formatValue?: (value: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  width: 300,
  height: 300,
  innerRadius: 60,
  outerRadius: 120,
  valueSuffix: '',
  centerPrimary: 'Total',
  centerSecondary: '',
  formatValue: (value: number) => value.toString()
})

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  data: { label: '', value: 0, percentage: 0 }
})

const total = computed(() => props.data.reduce((sum, item) => sum + item.value, 0))

const segments = computed(() => {
  let currentAngle = -Math.PI / 2 // Start at top
  
  return props.data.map(item => {
    const percentage = (item.value / total.value) * 100
    const angle = (item.value / total.value) * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    
    // Create arc path
    const x1 = props.outerRadius * Math.cos(startAngle)
    const y1 = props.outerRadius * Math.sin(startAngle)
    const x2 = props.outerRadius * Math.cos(endAngle)
    const y2 = props.outerRadius * Math.sin(endAngle)
    
    const x3 = props.innerRadius * Math.cos(endAngle)
    const y3 = props.innerRadius * Math.sin(endAngle)
    const x4 = props.innerRadius * Math.cos(startAngle)
    const y4 = props.innerRadius * Math.sin(startAngle)
    
    const largeArcFlag = angle > Math.PI ? 1 : 0
    
    const path = [
      `M ${x1} ${y1}`,
      `A ${props.outerRadius} ${props.outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${props.innerRadius} ${props.innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ')
    
    currentAngle = endAngle
    
    return {
      path,
      color: item.color,
      data: { ...item, percentage }
    }
  })
})

const showTooltip = (event: MouseEvent, data: DonutChartData & { percentage: number }) => {
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

.donut-chart {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.segment {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.segment:hover {
  opacity: 0.8;
}

.center-text-primary {
  font-size: 16px;
  font-weight: 600;
  fill: #333;
}

.center-text-secondary {
  font-size: 12px;
  fill: #6c757d;
}

.legend {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-label {
  flex-grow: 1;
  color: #333;
}

.legend-value {
  font-weight: 600;
  color: #007bff;
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

.percentage {
  color: #ffc107;
  font-weight: 600;
}
</style>