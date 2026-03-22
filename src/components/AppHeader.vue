<script setup lang="ts">
import { ref } from 'vue'
import { View } from '../types'
import { TALOS_VERSIONS, TalosVersion } from '../versions'

defineProps<{
  view: View
  selectedVersion: TalosVersion
  errorCount: number
  warningCount: number
}>()

const emit = defineEmits<{
  (e: 'view-change', v: View): void
  (e: 'version-change', v: TalosVersion): void
  (e: 'download'): void
  (e: 'share'): void
  (e: 'share-patch'): void
}>()

const copied = ref(false)
const patchCopied = ref(false)

function handleShare() {
  emit('share')
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function handleSharePatch() {
  emit('share-patch')
  patchCopied.value = true
  setTimeout(() => (patchCopied.value = false), 2000)
}

function handleVersionChange(ev: Event) {
  const v = TALOS_VERSIONS.find((t) => t.version === (ev.target as HTMLSelectElement).value)
  if (v) emit('version-change', v)
}
</script>

<template>
  <header class="sticky top-0 z-30 flex flex-col bg-surface shadow-lg shadow-black/30">
    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 py-3 gap-4 border-b border-border">
      <!-- Logo + title -->
      <div class="flex items-center gap-2.5 min-w-0">
        <div
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-primary font-mono font-bold text-sm text-white"
        >
          T
        </div>
        <div class="hidden sm:block">
          <div class="text-sm font-semibold leading-tight text-text">Talos Config Generator</div>
          <div class="text-xs text-muted leading-tight">Visual Talos Linux configuration</div>
        </div>
        <div class="block sm:hidden text-sm font-semibold text-text">Talos Config</div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- Validation badges -->
        <div v-if="errorCount > 0 || warningCount > 0" class="hidden sm:flex items-center gap-1.5">
          <span v-if="errorCount > 0" class="badge badge-error">
            {{ errorCount }} {{ errorCount === 1 ? 'error' : 'errors' }}
          </span>
          <span v-if="warningCount > 0" class="badge badge-warning">
            {{ warningCount }} {{ warningCount === 1 ? 'warning' : 'warnings' }}
          </span>
        </div>

        <!-- Version selector -->
        <select
          :value="selectedVersion.version"
          class="rounded border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text
            focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue/30 cursor-pointer"
          @change="handleVersionChange"
        >
          <option v-for="v in TALOS_VERSIONS" :key="v.version" :value="v.version">
            {{ v.label }}
          </option>
        </select>

        <!-- Download -->
        <button
          type="button"
          title="Download YAML"
          class="btn-secondary text-xs"
          @click="emit('download')"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span class="hidden sm:inline">Download</span>
        </button>

        <!-- Share -->
        <button
          type="button"
          title="Copy share URL"
          class="btn-secondary text-xs"
          :class="{ 'text-green border-green/40': copied }"
          @click="handleShare"
        >
          <template v-if="copied">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span class="hidden sm:inline">Copied!</span>
          </template>
          <template v-else>
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span class="hidden sm:inline">Share</span>
          </template>
        </button>

        <!-- Patch URL -->
        <button
          type="button"
          title="Copy patch YAML as data: URI (curl-friendly, unique to current config)"
          class="btn-secondary text-xs"
          :class="{ 'text-green border-green/40': patchCopied }"
          @click="handleSharePatch"
        >
          <template v-if="patchCopied">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span class="hidden sm:inline">Copied!</span>
          </template>
          <template v-else>
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span class="hidden sm:inline">Patch URL</span>
          </template>
        </button>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="flex px-4">
      <!-- Natural Language tab -->
      <button
        type="button"
        class="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors"
        :class="
          view === 'ai'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-text'
        "
        @click="emit('view-change', 'ai')"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Natural Language
      </button>

      <!-- Visual tab -->
      <button
        type="button"
        class="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors"
        :class="
          view === 'visual'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-text'
        "
        @click="emit('view-change', 'visual')"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Visual Config
      </button>

      <!-- YAML tab -->
      <button
        type="button"
        class="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors"
        :class="
          view === 'yaml'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-text'
        "
        @click="emit('view-change', 'yaml')"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        YAML
      </button>
    </div>
  </header>
</template>
