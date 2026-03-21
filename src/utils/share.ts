import LZString from 'lz-string'
import { TalosConfig } from '../types'

export function encodeConfig(config: TalosConfig): string {
  const json = JSON.stringify(config)
  return LZString.compressToEncodedURIComponent(json)
}

export function decodeConfig(encoded: string): TalosConfig | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as TalosConfig
  } catch {
    return null
  }
}

export function buildShareUrl(config: TalosConfig): string {
  const encoded = encodeConfig(config)
  const url = new URL(window.location.href)
  url.hash = `c=${encoded}`
  return url.toString()
}

export function loadConfigFromUrl(): TalosConfig | null {
  const hash = window.location.hash
  if (!hash.startsWith('#c=')) return null
  const encoded = hash.slice(3)
  return decodeConfig(encoded)
}

export function downloadYaml(yamlStr: string, filename = 'talosconfig.yaml') {
  const blob = new Blob([yamlStr], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
