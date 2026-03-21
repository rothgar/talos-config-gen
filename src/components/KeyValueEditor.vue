<script setup lang="ts">
import { KVPair } from '../types'
import { nextId } from '../defaults'

const props = defineProps<{
  label: string
  items: KVPair[]
  keyPlaceholder?: string
  valuePlaceholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:items', items: KVPair[]): void
}>()

function addItem() {
  emit('update:items', [...props.items, { _id: nextId(), key: '', value: '' }])
}

function removeItem(id: string) {
  emit('update:items', props.items.filter((i) => i._id !== id))
}

function updateKey(id: string, key: string) {
  emit('update:items', props.items.map((i) => (i._id === id ? { ...i, key } : i)))
}

function updateValue(id: string, value: string) {
  emit('update:items', props.items.map((i) => (i._id === id ? { ...i, value } : i)))
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium text-text">{{ label }}</span>
      <button type="button" class="btn-ghost text-xs py-0.5 px-2" @click="addItem">+ Add</button>
    </div>
    <p v-if="items.length === 0" class="text-xs text-muted italic">
      No entries. Click + Add to create one.
    </p>
    <div class="space-y-2">
      <div v-for="item in items" :key="item._id" class="flex gap-2 items-center">
        <input
          class="input-base flex-1 font-mono text-xs"
          :placeholder="keyPlaceholder ?? 'key'"
          :value="item.key"
          @input="updateKey(item._id, ($event.target as HTMLInputElement).value)"
        />
        <span class="text-muted text-xs flex-shrink-0">:</span>
        <input
          class="input-base flex-1 font-mono text-xs"
          :placeholder="valuePlaceholder ?? 'value'"
          :value="item.value"
          @input="updateValue(item._id, ($event.target as HTMLInputElement).value)"
        />
        <button
          type="button"
          class="text-muted hover:text-red transition-colors flex-shrink-0"
          aria-label="Remove"
          @click="removeItem(item._id)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
