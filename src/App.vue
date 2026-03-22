<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { TalosConfig, View } from './types'
import { TALOS_VERSIONS, TalosVersion, DEFAULT_VERSION } from './versions'
import { makeDefaultConfig, updateConfigForVersion } from './defaults'
import { configToYaml, yamlToConfig } from './utils/yaml'
import { buildShareUrl, loadConfigFromUrl, downloadYaml } from './utils/share'
import { validateConfig, ValidationError } from './utils/validation'
import AppHeader from './components/AppHeader.vue'
import VisualEditor from './components/VisualEditor.vue'
import YamlEditor from './components/YamlEditor.vue'
import AIAssistTab from './components/AIAssistTab.vue'

// ---------------------------------------------------------------------------
// Initialise from URL or defaults
// ---------------------------------------------------------------------------
function initState(): { config: TalosConfig; version: TalosVersion } {
  const fromUrl = loadConfigFromUrl()
  if (fromUrl) {
    const installerImage = fromUrl.machine?.install?.image ?? ''
    const matched = TALOS_VERSIONS.find((v) => installerImage.includes(v.version))
    return { config: fromUrl, version: matched ?? DEFAULT_VERSION }
  }
  return { config: makeDefaultConfig(DEFAULT_VERSION), version: DEFAULT_VERSION }
}

const initial = initState()

const config = ref<TalosConfig>(initial.config)
const version = ref<TalosVersion>(initial.version)
const view = ref<View>('ai')
const yamlText = ref<string>(configToYaml(initial.config))
const yamlError = ref<string | null>(null)
const yamlDirty = ref(false)

// ---------------------------------------------------------------------------
// Validation (re-runs on every config or version change)
// ---------------------------------------------------------------------------
const validationErrors = computed<ValidationError[]>(() =>
  validateConfig(config.value, version.value),
)

const validationErrorsMap = computed<Record<string, ValidationError>>(() =>
  Object.fromEntries(validationErrors.value.map((e) => [e.field, e])),
)

// When config changes (from visual editor) → regenerate YAML
watch(
  config,
  (next) => {
    if (!yamlDirty.value) {
      yamlText.value = configToYaml(next)
    }
  },
  { deep: true },
)

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
function handleConfigChange(next: TalosConfig) {
  config.value = next
}

function handleYamlChange(text: string) {
  yamlDirty.value = true
  yamlText.value = text
  const result = yamlToConfig(text)
  if (result.error) {
    yamlError.value = result.error
  } else if (result.config) {
    yamlError.value = null
    config.value = result.config
  }
}

function handleViewChange(next: View) {
  if (next === 'yaml' && !yamlDirty.value) {
    yamlText.value = configToYaml(config.value)
  }
  if (next === 'visual' && !yamlError.value) {
    yamlDirty.value = false
  }
  view.value = next
}

function handleVersionChange(v: TalosVersion) {
  version.value = v
  const updated = updateConfigForVersion(config.value, v)
  config.value = updated
  yamlDirty.value = false
  yamlText.value = configToYaml(updated)
  yamlError.value = null
}

function handleDownload() {
  const text = yamlDirty.value ? yamlText.value : configToYaml(config.value)
  const filename = `${config.value.cluster.clusterName || 'talos'}-${config.value.machine.type}.yaml`
  downloadYaml(text, filename)
}

function handleShare() {
  const url = buildShareUrl(config.value)
  navigator.clipboard.writeText(url).catch(() => {})
  window.history.replaceState(null, '', url)
}

function handleSharePatch() {
  const text = yamlDirty.value ? yamlText.value : configToYaml(config.value)
  const b64 = btoa(unescape(encodeURIComponent(text)))
  const url = `data:text/yaml;base64,${b64}`
  navigator.clipboard.writeText(url).catch(() => {})
}

const currentYaml = computed(() =>
  yamlDirty.value ? yamlText.value : configToYaml(config.value),
)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg">
    <AppHeader
      :view="view"
      :selected-version="version"
      :error-count="validationErrors.filter((e) => e.severity === 'error').length"
      :warning-count="validationErrors.filter((e) => e.severity === 'warning').length"
      @view-change="handleViewChange"
      @version-change="handleVersionChange"
      @download="handleDownload"
      @share="handleShare"
      @share-patch="handleSharePatch"
    />

    <main class="flex-1 overflow-hidden">
      <div v-show="view === 'ai'" class="h-[calc(100vh-88px)] flex flex-col">
        <AIAssistTab
          :config="config"
          :version="version"
          @update:config="handleConfigChange"
        />
      </div>

      <div v-if="view === 'visual'" class="h-[calc(100vh-88px)] overflow-y-auto">
        <VisualEditor
          :config="config"
          :version="version"
          :errors-map="validationErrorsMap"
          @update:config="handleConfigChange"
        />
      </div>

      <div v-else-if="view === 'yaml'" class="h-[calc(100vh-88px)] flex flex-col">
        <YamlEditor
          :value="currentYaml"
          :parse-error="yamlError"
          :validation-errors="validationErrors"
          @change="handleYamlChange"
        />
      </div>
    </main>
  </div>
</template>
