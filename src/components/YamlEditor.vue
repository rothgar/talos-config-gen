<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import loader from '@monaco-editor/loader'
import { ValidationError } from '../utils/validation'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IMonaco = any
type IEditor = any

const props = defineProps<{
  value: string
  parseError: string | null
  validationErrors: ValidationError[]
}>()

const emit = defineEmits<{
  (e: 'change', value: string): void
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let editor: IEditor | null = null
let monaco: IMonaco | null = null
let ignoreChange = false
let decorationIds: string[] = []

const errorsOpen = ref(false)
const errorCount = ref(0)
const warningCount = ref(0)

onMounted(async () => {
  if (!editorContainer.value) return

  // Configure Monaco to load from CDN
  loader.config({
    paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs' },
  })

  monaco = await loader.init()

  editor = monaco.editor.create(editorContainer.value, {
    value: props.value,
    language: 'yaml',
    theme: 'vs-dark',
    fontSize: 13,
    fontFamily: '"Roboto Mono", "Fira Code", monospace',
    fontLigatures: true,
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'none',
    padding: { top: 12, bottom: 12 },
    smoothScrolling: true,
    scrollbar: {
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
  })

  // Apply custom dark background to match Omni theme
  monaco.editor.defineTheme('omni-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#101118',
      'editor.lineHighlightBackground': '#1c1d27',
      'editorLineNumber.foreground': '#3d3e50',
      'editorLineNumber.activeForeground': '#9fa1a6',
      'editor.selectionBackground': '#2b2c3a',
      'editorCursor.foreground': '#ff6b35',
      'scrollbarSlider.background': '#2b2c3a80',
      'scrollbarSlider.hoverBackground': '#3d3e50',
    },
  })
  monaco.editor.setTheme('omni-dark')

  editor.onDidChangeModelContent(() => {
    if (ignoreChange) return
    emit('change', editor!.getValue())
  })

  updateDecorations()
})

onUnmounted(() => {
  editor?.dispose()
})

// When value changes externally (from visual editor) → update Monaco content
watch(
  () => props.value,
  (next) => {
    if (editor && editor.getValue() !== next) {
      ignoreChange = true
      const pos = editor.getPosition()
      editor.setValue(next)
      if (pos) editor.setPosition(pos)
      ignoreChange = false
    }
    updateDecorations()
  },
)

watch(() => props.validationErrors, updateDecorations, { deep: true })
watch(() => props.parseError, () => {
  errorCount.value = props.validationErrors.filter((e) => e.severity === 'error').length
  warningCount.value = props.validationErrors.filter((e) => e.severity === 'warning').length
})

watch(
  () => props.validationErrors,
  (errs) => {
    errorCount.value = errs.filter((e) => e.severity === 'error').length
    warningCount.value = errs.filter((e) => e.severity === 'warning').length
  },
  { immediate: true },
)

function updateDecorations() {
  if (!editor || !monaco) return
  // Clear previous
  decorationIds = editor.deltaDecorations(decorationIds, [])
}
</script>

<template>
  <div class="flex flex-col h-full bg-bg">
    <!-- Parse error banner -->
    <div
      v-if="parseError"
      class="flex items-start gap-2 px-4 py-2.5 bg-red/10 border-b border-red/30 text-red text-xs"
    >
      <svg class="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span class="font-medium">YAML parse error:&nbsp;</span>
      <span class="font-mono">{{ parseError }}</span>
    </div>

    <!-- Monaco editor -->
    <div ref="editorContainer" class="flex-1" />

    <!-- Validation summary footer -->
    <div class="border-t border-border bg-surface">
      <button
        v-if="errorCount > 0 || warningCount > 0"
        type="button"
        class="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
        @click="errorsOpen = !errorsOpen"
      >
        <div class="flex items-center gap-2">
          <span v-if="errorCount > 0" class="badge badge-error">
            {{ errorCount }} {{ errorCount === 1 ? 'error' : 'errors' }}
          </span>
          <span v-if="warningCount > 0" class="badge badge-warning">
            {{ warningCount }} {{ warningCount === 1 ? 'warning' : 'warnings' }}
          </span>
          <span class="text-muted">Click to {{ errorsOpen ? 'hide' : 'show' }} details</span>
        </div>
        <svg
          class="h-3.5 w-3.5 text-muted transition-transform"
          :class="{ 'rotate-180': errorsOpen }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div v-if="errorsOpen && (errorCount > 0 || warningCount > 0)" class="max-h-48 overflow-y-auto border-t border-border">
        <div
          v-for="(err, i) in validationErrors"
          :key="i"
          class="flex items-start gap-2 px-4 py-1.5 text-xs border-b border-border/50 last:border-0"
        >
          <span
            class="flex-shrink-0 font-medium mt-0.5"
            :class="err.severity === 'error' ? 'text-red' : 'text-yellow'"
          >
            {{ err.severity === 'error' ? '✖' : '⚠' }}
          </span>
          <div>
            <span class="font-mono text-muted">{{ err.field }}</span>
            <span class="text-muted mx-1">—</span>
            <span :class="err.severity === 'error' ? 'text-red' : 'text-yellow'">{{ err.message }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between px-4 py-1.5 text-xs text-muted">
        <span v-if="errorCount === 0 && warningCount === 0" class="flex items-center gap-1 text-green">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          No validation issues
        </span>
        <span v-else />
        <span>{{ value.split('\n').length }} lines · YAML edits sync to Visual Config</span>
      </div>
    </div>
  </div>
</template>
