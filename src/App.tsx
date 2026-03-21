import { useState, useCallback, useRef } from 'react'
import { TalosConfig, View } from './types'
import { TALOS_VERSIONS, TalosVersion, DEFAULT_VERSION } from './versions'
import { makeDefaultConfig, updateConfigForVersion } from './defaults'
import { configToYaml, yamlToConfig } from './utils/yaml'
import { buildShareUrl, loadConfigFromUrl, downloadYaml } from './utils/share'
import Header from './components/Header'
import VisualEditor from './components/VisualEditor'
import YamlEditor from './components/YamlEditor'

function initState(): { config: TalosConfig; version: TalosVersion } {
  // Try to load from URL hash first
  const fromUrl = loadConfigFromUrl()
  if (fromUrl) {
    // Try to detect version from installer image
    const installerImage = fromUrl.machine?.install?.image ?? ''
    const matched = TALOS_VERSIONS.find((v) => installerImage.includes(v.version))
    return { config: fromUrl, version: matched ?? DEFAULT_VERSION }
  }
  return { config: makeDefaultConfig(DEFAULT_VERSION), version: DEFAULT_VERSION }
}

export default function App() {
  const initial = initState()
  const [config, setConfigRaw] = useState<TalosConfig>(initial.config)
  const [version, setVersion] = useState<TalosVersion>(initial.version)
  const [view, setView] = useState<View>('visual')
  const [yamlText, setYamlText] = useState<string>(() => configToYaml(initial.config))
  const [yamlError, setYamlError] = useState<string | null>(null)

  // Track whether yaml was edited so we don't overwrite user changes on re-render
  const yamlDirty = useRef(false)

  // When visual config changes → regenerate YAML
  const setConfig = useCallback((next: TalosConfig) => {
    setConfigRaw(next)
    if (!yamlDirty.current) {
      setYamlText(configToYaml(next))
    }
  }, [])

  // When YAML text changes → try to parse and update config
  function handleYamlChange(text: string) {
    yamlDirty.current = true
    setYamlText(text)
    const result = yamlToConfig(text)
    if (result.error) {
      setYamlError(result.error)
    } else if (result.config) {
      setYamlError(null)
      setConfigRaw(result.config)
    }
  }

  // When switching to YAML view → sync YAML from current config (unless yaml has edits)
  function handleViewChange(next: View) {
    if (next === 'yaml') {
      if (!yamlDirty.current) {
        setYamlText(configToYaml(config))
      }
    }
    if (next === 'visual') {
      // When switching back to visual, clear dirty flag so next visual edit regenerates
      if (!yamlError) {
        yamlDirty.current = false
      }
    }
    setView(next)
  }

  function handleVersionChange(v: TalosVersion) {
    setVersion(v)
    const updated = updateConfigForVersion(config, v)
    setConfigRaw(updated)
    yamlDirty.current = false
    setYamlText(configToYaml(updated))
    setYamlError(null)
  }

  function handleDownload() {
    const text = yamlDirty.current ? yamlText : configToYaml(config)
    const filename = `${config.cluster.clusterName || 'talos'}-${config.machine.type}.yaml`
    downloadYaml(text, filename)
  }

  function handleShare() {
    const url = buildShareUrl(config)
    navigator.clipboard.writeText(url).catch(() => {
      // Fallback: update URL without clipboard
      window.history.replaceState(null, '', url)
    })
    window.history.replaceState(null, '', url)
  }

  const currentYaml = yamlDirty.current ? yamlText : configToYaml(config)

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        view={view}
        onViewChange={handleViewChange}
        selectedVersion={version}
        onVersionChange={handleVersionChange}
        onDownload={handleDownload}
        onShare={handleShare}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'visual' ? (
          <div className="h-[calc(100vh-88px)] overflow-y-auto">
            <VisualEditor config={config} onChange={setConfig} />
          </div>
        ) : (
          <div className="h-[calc(100vh-88px)] flex flex-col">
            <YamlEditor
              value={currentYaml}
              onChange={handleYamlChange}
              error={yamlError}
            />
          </div>
        )}
      </main>
    </div>
  )
}
