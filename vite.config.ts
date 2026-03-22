import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
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

/** Fetch via HTTPS proxy tunnel when proxy env vars are set, else use native fetch. */
function anthropicFetch(urlStr: string, options: { headers: Record<string, string>; body: string }): Promise<{ status: number; headers: Map<string, string>; body: NodeJS.ReadableStream }> {
  const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY
  return new Promise((resolve, reject) => {
    const target = new URL(urlStr)

    const respond = (socket: import('node:stream').Duplex | null, agent?: https.Agent) => {
      const req = https.request(
        {
          hostname: target.hostname,
          port: target.port || 443,
          path: target.pathname + target.search,
          method: 'POST',
          headers: options.headers,
          agent,
        },
        (res) => {
          const hdrs = new Map<string, string>()
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === 'string') hdrs.set(k, v)
          }
          resolve({ status: res.statusCode ?? 200, headers: hdrs, body: res })
        },
      )
      req.on('error', reject)
      req.write(options.body)
      req.end()
    }

    if (proxyUrl) {
      const proxy = new URL(proxyUrl)
      const connectReq = http.request({
        hostname: proxy.hostname,
        port: Number(proxy.port) || 80,
        method: 'CONNECT',
        path: `${target.hostname}:443`,
        headers: proxy.username
          ? { 'Proxy-Authorization': 'Basic ' + Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64') }
          : {},
      })
      connectReq.on('connect', (_res, socket) => {
        const agent = new https.Agent({ socket } as unknown as https.AgentOptions)
        respond(socket, agent)
      })
      connectReq.on('error', reject)
      connectReq.end()
    } else {
      respond(null)
    }
  })
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
              const upstream = await anthropicFetch('https://api.anthropic.com/v1/messages', {
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body,
              })
              res.writeHead(upstream.status, {
                'Content-Type': upstream.headers.get('content-type') ?? 'text/event-stream',
                'Cache-Control': 'no-store',
              })
              upstream.body.pipe(res)
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

export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ prefixed) so the dev proxy can use ANTHROPIC_API_KEY
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [vue(), generatePatches(), devAiProxy()],
    base: '/talos-config-gen/',
  }
})
