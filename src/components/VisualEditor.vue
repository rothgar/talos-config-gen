<script setup lang="ts">
import { ref, provide, computed } from 'vue'
import { TalosConfig } from '../types'
import { TalosVersion } from '../versions'
import { ValidationError } from '../utils/validation'
import MachineSection from './visual/MachineSection.vue'
import ClusterSection from './visual/ClusterSection.vue'

const props = defineProps<{
  config: TalosConfig
  version: TalosVersion
  errorsMap: Record<string, ValidationError>
}>()

const emit = defineEmits<{
  (e: 'update:config', val: TalosConfig): void
}>()

// Provide errors map as a reactive ref so injected child components stay reactive
const errorsMapRef = computed(() => props.errorsMap)
provide('errorsMap', errorsMapRef)

type TopSection = 'machine' | 'cluster'
const openSection = ref<TopSection>('machine')

function toggle(s: TopSection) {
  openSection.value = openSection.value === s ? ('cluster' === s ? 'machine' : 'cluster') : s
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-4">
    <!-- Machine Configuration -->
    <TopCard
      id="machine"
      title="Machine Configuration"
      subtitle="Node-level settings: network, install, kubelet, features"
      accent="primary"
      :open="openSection === 'machine'"
      @toggle="toggle('machine')"
    >
      <MachineSection :config="config" :version="version" @update:config="emit('update:config', $event)" />
    </TopCard>

    <!-- Cluster Configuration -->
    <TopCard
      id="cluster"
      title="Cluster Configuration"
      subtitle="Cluster-wide settings: control plane, networking, components"
      accent="blue"
      :open="openSection === 'cluster'"
      @toggle="toggle('cluster')"
    >
      <ClusterSection :config="config" :version="version" @update:config="emit('update:config', $event)" />
    </TopCard>
  </div>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue'

// Inline sub-component to avoid an extra file for a simple card
const TopCard = defineComponent({
  props: {
    id: String,
    title: String,
    subtitle: String,
    accent: { type: String as () => 'primary' | 'blue', default: 'primary' },
    open: Boolean,
  },
  emits: ['toggle'],
  setup(props, { emit, slots }) {
    return () => {
      const accentBar = props.accent === 'primary' ? 'bg-primary' : 'bg-blue'
      const accentText = props.accent === 'primary' ? 'text-primary' : 'text-blue'
      const accentBorder = props.accent === 'primary' ? 'border-primary/20' : 'border-blue/20'
      const accentBg = props.accent === 'primary' ? 'bg-primary/5' : 'bg-blue/5'

      return h('div', { class: 'rounded-xl border border-border bg-surface shadow-sm overflow-hidden' }, [
        h(
          'button',
          {
            type: 'button',
            class: `w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${accentBg} hover:opacity-90 border-b ${accentBorder}`,
            onClick: () => emit('toggle'),
          },
          [
            h('div', { class: `h-8 w-1 rounded-full ${accentBar} flex-shrink-0` }),
            h('div', { class: 'flex-1 min-w-0' }, [
              h('div', { class: `text-base font-bold ${accentText}` }, props.title),
              h('div', { class: 'text-xs text-muted mt-0.5' }, props.subtitle),
            ]),
            h(
              'svg',
              {
                class: `h-5 w-5 text-muted transition-transform flex-shrink-0 ${props.open ? 'rotate-180' : ''}`,
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor',
                'stroke-width': '2',
              },
              [
                h('path', {
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  d: 'M19 9l-7 7-7-7',
                }),
              ],
            ),
          ],
        ),
        props.open
          ? h('div', { class: 'p-5' }, slots.default?.())
          : null,
      ])
    }
  },
})
</script>
