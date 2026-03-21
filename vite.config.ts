import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { TALOS_VERSIONS } from './src/versions'
import { makeDefaultConfig } from './src/defaults'
import { configToDoc } from './src/utils/yaml'

function generatePatches(): import('vite').Plugin {
  function write() {
    const dir = path.resolve(__dirname, 'public/patches')
    fs.mkdirSync(dir, { recursive: true })
    for (const v of TALOS_VERSIONS) {
      for (const type of ['controlplane', 'worker'] as const) {
        const config = makeDefaultConfig(v)
        config.machine.type = type
        const doc = configToDoc(config)
        const content = yaml.dump(doc, { lineWidth: 120, noRefs: true, indent: 2 })
        fs.writeFileSync(path.join(dir, `${v.version}-${type}.yaml`), content)
      }
    }
  }

  return {
    name: 'generate-patches',
    buildStart: write,
  }
}

export default defineConfig({
  plugins: [vue(), generatePatches()],
  base: '/talos-config-gen/',
})
