<script setup lang="ts">
import { UserVolume } from '../../types'
import { nextId } from '../../defaults'

const props = defineProps<{
  volumes: UserVolume[]
}>()

const emit = defineEmits<{
  (e: 'update:volumes', val: UserVolume[]): void
}>()

function addVolume() {
  emit('update:volumes', [
    ...props.volumes,
    { _id: nextId(), name: '', minSize: '', maxSize: '', diskSelectorSize: '', diskSelectorName: '' },
  ])
}

function removeVolume(id: string) {
  emit('update:volumes', props.volumes.filter((v) => v._id !== id))
}

function patchVolume(id: string, patch: Partial<UserVolume>) {
  emit('update:volumes', props.volumes.map((v) => (v._id === id ? { ...v, ...patch } : v)))
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium text-text">User Volumes</span>
      <button type="button" class="btn-ghost text-xs py-0.5 px-2" @click="addVolume">
        + Add Volume
      </button>
    </div>
    <p v-if="volumes.length === 0" class="text-xs text-muted italic">No user volumes configured.</p>

    <div class="space-y-3">
      <div
        v-for="vol in volumes"
        :key="vol._id"
        class="rounded border border-border bg-surface p-3 space-y-2"
      >
        <div class="flex items-center gap-2">
          <input
            class="input-base flex-1 font-mono text-xs"
            placeholder="volume name (e.g. var-lib-containerd)"
            :value="vol.name"
            @input="patchVolume(vol._id, { name: ($event.target as HTMLInputElement).value })"
          />
          <button
            type="button"
            class="text-muted hover:text-red transition-colors flex-shrink-0"
            @click="removeVolume(vol._id)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-muted block mb-1">Min Size</label>
            <input
              class="input-base font-mono text-xs"
              placeholder="e.g. 10GB"
              :value="vol.minSize"
              @input="patchVolume(vol._id, { minSize: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">Max Size</label>
            <input
              class="input-base font-mono text-xs"
              placeholder="e.g. 100GB"
              :value="vol.maxSize"
              @input="patchVolume(vol._id, { maxSize: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">Disk Selector: Size</label>
            <input
              class="input-base font-mono text-xs"
              placeholder=">= 100GB"
              :value="vol.diskSelectorSize"
              @input="patchVolume(vol._id, { diskSelectorSize: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">Disk Selector: Name</label>
            <input
              class="input-base font-mono text-xs"
              placeholder="/dev/sdb"
              :value="vol.diskSelectorName"
              @input="patchVolume(vol._id, { diskSelectorName: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
