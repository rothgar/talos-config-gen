<script setup lang="ts">
const props = defineProps<{
  label: string
  items: string[]
  placeholder?: string
  hint?: string
  itemErrors?: Record<number, string>
}>()

const emit = defineEmits<{
  (e: 'update:items', items: string[]): void
}>()

function addItem() {
  emit('update:items', [...props.items, ''])
}

function removeItem(idx: number) {
  emit('update:items', props.items.filter((_, i) => i !== idx))
}

function updateItem(idx: number, value: string) {
  emit('update:items', props.items.map((v, i) => (i === idx ? value : v)))
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <span class="text-sm font-medium text-text">{{ label }}</span>
      <button type="button" class="btn-ghost text-xs py-0.5 px-2" @click="addItem">+ Add</button>
    </div>
    <p v-if="hint" class="text-xs text-muted mb-1.5">{{ hint }}</p>
    <p v-if="items.length === 0" class="text-xs text-muted italic">
      No entries. Click + Add to create one.
    </p>
    <div class="space-y-1.5">
      <div v-for="(item, idx) in items" :key="idx">
        <div class="flex gap-2 items-center">
          <input
            class="input-base flex-1 font-mono text-xs"
            :class="{
              'input-error': itemErrors?.[idx] !== undefined,
            }"
            :placeholder="placeholder ?? 'value'"
            :value="item"
            @input="updateItem(idx, ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="text-muted hover:text-red transition-colors flex-shrink-0"
            aria-label="Remove"
            @click="removeItem(idx)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p v-if="itemErrors?.[idx]" class="text-xs text-red mt-0.5">{{ itemErrors[idx] }}</p>
      </div>
    </div>
  </div>
</template>
