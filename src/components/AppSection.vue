<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  subtitle?: string
  defaultOpen?: boolean
  badge?: string
  badgeSeverity?: 'error' | 'warning' | 'info' | 'primary'
}>()

const open = ref(props.defaultOpen !== false)
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-2 overflow-hidden">
    <button
      type="button"
      class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface transition-colors"
      @click="open = !open"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-medium text-text truncate">{{ title }}</span>
        <span
          v-if="badge"
          :class="[
            'badge flex-shrink-0',
            badgeSeverity === 'error'
              ? 'badge-error'
              : badgeSeverity === 'warning'
                ? 'badge-warning'
                : badgeSeverity === 'primary'
                  ? 'badge-primary'
                  : 'badge-info',
          ]"
        >
          {{ badge }}
        </span>
        <span v-if="subtitle" class="text-xs text-muted truncate hidden sm:block">{{ subtitle }}</span>
      </div>
      <svg
        class="h-4 w-4 text-muted transition-transform flex-shrink-0 ml-2"
        :class="{ 'rotate-180': open }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div v-if="open" class="px-4 pb-4 pt-2 border-t border-border space-y-3">
      <slot />
    </div>
  </div>
</template>
