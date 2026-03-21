<script setup lang="ts">
import { ValidationError } from '../utils/validation'

defineProps<{
  label: string
  hint?: string
  htmlFor?: string
  inline?: boolean
  error?: ValidationError
}>()
</script>

<template>
  <!-- Inline (checkbox) layout -->
  <div v-if="inline" class="flex items-start gap-3">
    <slot />
    <div class="pt-0.5">
      <label :for="htmlFor" class="text-sm font-medium text-text cursor-pointer">
        {{ label }}
      </label>
      <p v-if="hint" class="text-xs text-muted mt-0.5">{{ hint }}</p>
      <p
        v-if="error"
        class="text-xs mt-0.5"
        :class="error.severity === 'error' ? 'text-red' : 'text-yellow'"
      >
        {{ error.message }}
      </p>
    </div>
  </div>

  <!-- Stacked layout -->
  <div v-else>
    <label :for="htmlFor" class="block text-sm font-medium text-text mb-1">
      {{ label }}
    </label>
    <p v-if="hint" class="text-xs text-muted mb-1.5">{{ hint }}</p>
    <slot />
    <p
      v-if="error"
      class="text-xs mt-1"
      :class="error.severity === 'error' ? 'text-red' : 'text-yellow'"
    >
      {{ error.message }}
    </p>
  </div>
</template>
