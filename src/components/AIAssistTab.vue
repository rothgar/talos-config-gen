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

// ---------------------------------------------------------------------------
// Proxy vs direct-API mode
//
// VITE_AI_PROXY_URL is injected at build time by the GitHub Actions workflow
// when a Cloudflare Worker has been deployed. When set the browser sends
// requests to the worker (which holds the Anthropic key server-side).
// When not set the user must supply their own Anthropic API key.
// ---------------------------------------------------------------------------
const PROXY_URL: string = import.meta.env.VITE_AI_PROXY_URL ?? ''
const usingProxy = PROXY_URL.length > 0

// ---------------------------------------------------------------------------
// User API key (only needed when not using the proxy)
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'talos-ai-api-key'
const apiKey = ref<string>(localStorage.getItem(STORAGE_KEY) ?? '')
const showApiKeyInput = ref<boolean>(!usingProxy && !apiKey.value)

function saveApiKey() {
  localStorage.setItem(STORAGE_KEY, apiKey.value)
  showApiKeyInput.value = false
}

function clearApiKey() {
  apiKey.value = ''
  localStorage.removeItem(STORAGE_KEY)
  showApiKeyInput.value = true
}

// True when the tab is ready to send messages
const canSend = computed(() => usingProxy || apiKey.value.length > 0)

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
const error = ref<string | null>(null)
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

Your job:
1. Help the user generate or modify a complete, valid Talos v1alpha1 machine config YAML.
2. If required fields are missing (install disk like /dev/sda, controlplane endpoint like https://192.168.1.10:6443, machine type), ask the user for them before generating a full config.
3. When you produce a final config, output it as a single fenced YAML code block (triple backtick yaml).
4. Only output one YAML block per response — the complete config, not snippets.
5. Use the correct Talos v1alpha1 structure with 'version: v1alpha1', 'debug: false', 'persist: true', 'machine:' and 'cluster:' top-level keys.
6. Default installer image: ${props.version.installerImage}
7. Default kubelet image: ${props.version.kubeletImage}
8. Use these Kubernetes component images from this version:
   - kube-apiserver: ${props.version.apiServerImage}
   - kube-controller-manager: ${props.version.controllerManagerImage}
   - kube-scheduler: ${props.version.schedulerImage}
   - etcd: ${props.version.etcdImage}
   - coredns: ${props.version.coreDNSImage}
9. Be concise but helpful. Ask clarifying questions when needed.`
}

// ---------------------------------------------------------------------------
// Streaming fetch — routes to proxy or Anthropic directly
// ---------------------------------------------------------------------------
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return
  if (!canSend.value) {
    showApiKeyInput.value = true
    return
  }

  error.value = null
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  await scrollToBottom()

  messages.value.push({ role: 'assistant', content: '' })
  const idx = messages.value.length - 1
  isStreaming.value = true

  try {
    const body = {
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: buildSystemPrompt(),
      stream: true,
      messages: messages.value
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content })),
    }

    // Build request based on mode
    const url = usingProxy ? PROXY_URL : 'https://api.anthropic.com/v1/messages'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (usingProxy) {
      // No auth header — the worker injects the Anthropic key server-side
    } else {
      headers['x-api-key'] = apiKey.value
      headers['anthropic-version'] = '2023-06-01'
      headers['anthropic-dangerous-direct-browser-access'] = 'true'
    }

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })

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
    error.value = e.message
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
// Render helpers — simple markdown-like rendering
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

// ---------------------------------------------------------------------------
// Starter prompts
// ---------------------------------------------------------------------------
const starters = [
  'Generate a controlplane config for a single-node cluster',
  'Help me set up a 3-node cluster with static IPs',
  'Create a worker node config for my existing cluster',
  'Generate a config with custom disk partitioning',
]

function useStarter(s: string) {
  inputText.value = s
}

const hasMessages = computed(() => messages.value.length > 0)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Proxy mode banner -->
    <div v-if="usingProxy" class="border-b border-border bg-surface-2 px-4 py-1.5 flex items-center justify-between">
      <span class="text-xs text-muted">
        <span class="text-green font-medium">●</span>
        AI powered by the project — limited to Talos config generation · 20 req/hour
      </span>
      <button
        type="button"
        class="text-xs text-muted hover:text-text transition-colors"
        @click="showApiKeyInput = !showApiKeyInput"
      >
        Use your own key
      </button>
    </div>

    <!-- User API key entry (direct mode, or override in proxy mode) -->
    <div
      v-if="showApiKeyInput"
      class="border-b border-border bg-surface-2 px-4 py-3"
    >
      <div class="max-w-2xl mx-auto">
        <p class="text-xs text-muted mb-2">
          Enter your
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener"
            class="text-blue underline"
          >Anthropic API key</a>
          to use AI assistance directly. Stored only in your browser's localStorage.
          <template v-if="usingProxy"> Overrides the shared proxy key.</template>
        </p>
        <div class="flex gap-2">
          <input
            v-model="apiKey"
            type="password"
            placeholder="sk-ant-..."
            class="input-base font-mono text-xs flex-1"
            @keydown.enter="saveApiKey"
          />
          <button
            type="button"
            class="btn-primary text-xs"
            :disabled="!apiKey.trim()"
            @click="saveApiKey"
          >
            Save
          </button>
          <button v-if="usingProxy" type="button" class="btn-secondary text-xs" @click="showApiKeyInput = false">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Direct mode: key configured indicator -->
    <div
      v-else-if="!usingProxy"
      class="border-b border-border bg-surface-2 px-4 py-1.5 flex items-center justify-between"
    >
      <span class="text-xs text-muted">
        <span class="text-green font-medium">●</span> Using your API key
      </span>
      <button type="button" class="text-xs text-muted hover:text-text transition-colors" @click="clearApiKey">
        Change key
      </button>
    </div>

    <!-- Messages area -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-4 py-4">
      <!-- Starter prompts when empty -->
      <div v-if="!hasMessages" class="max-w-2xl mx-auto">
        <div class="text-center mb-8 mt-4">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h2 class="text-sm font-semibold text-text mb-1">AI Config Assistant</h2>
          <p class="text-xs text-muted">
            Describe what you want and Claude will generate a complete Talos config.<br />
            It will ask for required fields like install disk and cluster endpoint.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            v-for="s in starters"
            :key="s"
            type="button"
            class="text-left px-3 py-2.5 rounded-lg border border-border bg-surface-2 hover:border-primary/50 hover:bg-primary/5 text-xs text-text transition-colors"
            @click="useStarter(s)"
          >
            {{ s }}
          </button>
        </div>
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

    <!-- Input area -->
    <div class="border-t border-border bg-surface px-4 py-3">
      <div class="max-w-2xl mx-auto flex gap-2 items-end">
        <textarea
          v-model="inputText"
          rows="2"
          placeholder="Describe your cluster setup, or ask for help with specific settings…"
          class="input-base text-xs flex-1 resize-none leading-relaxed"
          style="min-height: 56px; max-height: 200px"
          :disabled="isStreaming"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact.stop
        />
        <button
          type="button"
          class="btn-primary text-xs flex-shrink-0 self-end"
          :disabled="!inputText.trim() || isStreaming || !canSend"
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
  </div>
</template>
