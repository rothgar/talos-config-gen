import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
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

function devAiProxy(): import('vite').Plugin {
  return {
    name: 'dev-ai-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/api/ai',
        async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          if (req.method !== 'POST') { next(); return }

          const apiKey = process.env.ANTHROPIC_API_KEY
          if (!apiKey) {
            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY not set in .env.local' } }))
            return
          }

          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks).toString()
              const upstream = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body,
              })
              res.writeHead(upstream.status, {
                'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
                'Cache-Control': 'no-store',
              })
              const reader = upstream.body!.getReader()
              const pump = async () => {
                const { done, value } = await reader.read()
                if (done) { res.end(); return }
                res.write(value)
                await pump()
              }
              await pump()
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: { message: String(err) } }))
            }
          })
        },
      )
    },
  }
}

export default defineConfig({
  plugins: [vue(), generatePatches(), devAiProxy()],
  base: '/talos-config-gen/',
})
