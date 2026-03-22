<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { TalosConfig } from '../types'
import { TalosVersion } from '../versions'
import { configToYaml, yamlToConfig } from '../utils/yaml'

const props = defineProps<{
  config: TalosConfig
  version: TalosVersion
}>()

const emit = defineEmits<{
  (e: 'update:config', val: TalosConfig): void
}>()

// VITE_AI_PROXY_URL is baked in at build time by the GitHub Actions pipeline.
const PROXY_URL: string = import.meta.env.VITE_AI_PROXY_URL ?? ''

// ---------------------------------------------------------------------------
// Chat state
// ---------------------------------------------------------------------------
interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([])
const inputText = ref('')
const isStreaming = ref(false)
const messagesEl = ref<HTMLElement | null>(null)

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
function buildSystemPrompt(): string {
  const currentYaml = configToYaml(props.config)
  return `You are a Talos Linux configuration assistant. You help users generate valid Talos Linux machine config YAML files.

The user is currently using Talos version ${props.version.version} (Kubernetes ${props.version.k8sVersion}).

Current configuration (for context):
\`\`\`yaml
${currentYaml}
\`\`\`

Rules:
1. Generate complete, valid Talos v1alpha1 machine config YAML.
2. REQUIRED fields — if the user has not provided them, ask before generating:
   - Machine type: controlplane or worker
   - Install disk: e.g. /dev/sda (run \`talosctl disks\` to list)
   - Cluster endpoint (controlplane only): e.g. https://192.168.1.10:6443
3. Cluster name: always invent a short, memorable two-word name (adjective + noun, e.g. "iron-falcon", "quiet-mesa", "swift-harbor"). Never use "talos-cluster" or generic names.
4. Output exactly one fenced YAML code block per response — the complete config, not snippets.
5. Use the correct structure: version: v1alpha1, debug: false, persist: true, machine: and cluster: top-level keys.
6. Default installer image: ${props.version.installerImage}
7. Default kubelet image: ${props.version.kubeletImage}
8. Kubernetes component images for this version:
   - kube-apiserver: ${props.version.apiServerImage}
   - kube-controller-manager: ${props.version.controllerManagerImage}
   - kube-scheduler: ${props.version.schedulerImage}
   - etcd: ${props.version.etcdImage}
   - coredns: ${props.version.coreDNSImage}
9. Be concise. Only ask for one missing piece of information at a time.`
}

// ---------------------------------------------------------------------------
// Streaming fetch via the embedded proxy
// ---------------------------------------------------------------------------
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  await scrollToBottom()

  messages.value.push({ role: 'assistant', content: '' })
  const idx = messages.value.length - 1
  isStreaming.value = true

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: buildSystemPrompt(),
        stream: true,
        messages: messages.value
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error((errData as any)?.error?.message ?? `HTTP ${response.status}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') break
        try {
          const evt = JSON.parse(data)
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            messages.value[idx].content += evt.delta.text
            await scrollToBottom()
          }
        } catch {
          // ignore SSE parse errors
        }
      }
    }
  } catch (e: any) {
    messages.value[idx].content = `⚠️ Error: ${e.message}`
  } finally {
    isStreaming.value = false
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

// ---------------------------------------------------------------------------
// YAML detection and apply
// ---------------------------------------------------------------------------
function applyYaml(yaml: string) {
  const result = yamlToConfig(yaml)
  if (result.config) {
    emit('update:config', result.config)
  }
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
function renderContent(content: string): { type: 'text' | 'yaml'; value: string }[] {
  const parts: { type: 'text' | 'yaml'; value: string }[] = []
  const re = /```ya?ml\n([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', value: content.slice(last, m.index) })
    }
    parts.push({ type: 'yaml', value: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < content.length) {
    parts.push({ type: 'text', value: content.slice(last) })
  }
  return parts
}

const hasMessages = computed(() => messages.value.length > 0)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Input area -->
    <div class="border-b border-border bg-surface px-4 py-3">
      <div class="max-w-2xl mx-auto flex gap-2 items-end">
        <textarea
          v-model="inputText"
          rows="2"
          placeholder="e.g. controlplane on /dev/sda, endpoint https://192.168.1.10:6443, 3-node HA…"
          class="input-base text-xs flex-1 resize-none leading-relaxed"
          style="min-height: 56px; max-height: 200px"
          :disabled="isStreaming"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact.stop
        />
        <button
          type="button"
          class="btn-primary text-xs flex-shrink-0 self-end"
          :disabled="!inputText.trim() || isStreaming"
          @click="sendMessage"
        >
          <svg v-if="!isStreaming" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <svg v-else class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </button>
      </div>
      <p class="text-center text-[10px] text-muted mt-1.5 max-w-2xl mx-auto">
        Press Enter to send · Shift+Enter for new line · Config is applied directly to the Visual/YAML editors
      </p>
    </div>

    <!-- Messages area -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-4 py-4">
      <!-- Empty state hint -->
      <div v-if="!hasMessages" class="max-w-xl mx-auto mt-10 text-center">
        <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
          <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <h2 class="text-sm font-semibold text-text mb-2">Describe your cluster in plain English</h2>
        <p class="text-xs text-muted leading-relaxed">
          Include your <span class="text-text font-medium">install disk</span> (e.g. <code class="font-mono">/dev/sda</code>)
          and <span class="text-text font-medium">cluster endpoint</span> (e.g. <code class="font-mono">https://192.168.1.10:6443</code>)
          and a config will be generated straight away.<br />
          If you leave them out, the AI will ask.
        </p>
      </div>

      <!-- Conversation -->
      <div v-else class="max-w-2xl mx-auto space-y-4">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="flex gap-3"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <!-- Assistant avatar -->
          <div
            v-if="msg.role === 'assistant'"
            class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5"
          >
            <svg class="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>

          <!-- Message bubble -->
          <div
            class="max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed"
            :class="
              msg.role === 'user'
                ? 'bg-primary text-white'
                : 'bg-surface-2 border border-border text-text'
            "
          >
            <!-- User: plain text -->
            <template v-if="msg.role === 'user'">
              <span class="whitespace-pre-wrap">{{ msg.content }}</span>
            </template>

            <!-- Assistant: rich rendering with YAML blocks -->
            <template v-else>
              <template v-if="!msg.content && isStreaming && i === messages.length - 1">
                <span class="inline-flex gap-1 items-center text-muted">
                  <span class="animate-pulse">●</span>
                  <span class="animate-pulse" style="animation-delay:150ms">●</span>
                  <span class="animate-pulse" style="animation-delay:300ms">●</span>
                </span>
              </template>
              <template v-else>
                <div class="space-y-2">
                  <template v-for="(part, pi) in renderContent(msg.content)" :key="pi">
                    <!-- Text part -->
                    <p v-if="part.type === 'text'" class="whitespace-pre-wrap">{{ part.value }}</p>

                    <!-- YAML block -->
                    <div v-else class="rounded-lg overflow-hidden border border-border/60">
                      <div class="flex items-center justify-between bg-surface px-3 py-1.5 border-b border-border/60">
                        <span class="text-[10px] font-mono text-muted uppercase tracking-wide">yaml</span>
                        <button
                          type="button"
                          class="btn-primary text-[10px] py-0.5 px-2"
                          @click="applyYaml(part.value)"
                        >
                          Apply Config
                        </button>
                      </div>
                      <pre class="px-3 py-2 text-[10px] font-mono overflow-x-auto text-text bg-bg leading-relaxed">{{ part.value }}</pre>
                    </div>
                  </template>
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
