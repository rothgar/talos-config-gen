export interface Env {
  ANTHROPIC_API_KEY: string
  ALLOWED_ORIGIN?: string // e.g. "https://your-user.github.io" — restricts CORS
}

// ---------------------------------------------------------------------------
// In-memory rate limiter (per isolate — resets when CF recycles the worker).
// Good enough for abuse prevention on a personal project. Upgrade to Durable
// Objects if you need globally-consistent limits across all CF edge nodes.
// ---------------------------------------------------------------------------
const RATE_LIMIT_REQUESTS = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_TOKENS_CAP = 4096

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

function checkRateLimit(ip: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  let entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    rateLimitMap.set(ip, entry)
  }

  entry.count++
  return {
    allowed: entry.count <= RATE_LIMIT_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_REQUESTS - entry.count),
    resetAt: entry.resetAt,
  }
}

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------
function corsHeaders(origin: string, allowedOrigin: string): Record<string, string> {
  const allow = allowedOrigin || '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function originAllowed(requestOrigin: string, allowedOrigin: string | undefined): boolean {
  if (!allowedOrigin) return true // wildcard — allow all
  return requestOrigin === allowedOrigin
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestOrigin = request.headers.get('Origin') ?? ''
    const cors = corsHeaders(requestOrigin, env.ALLOWED_ORIGIN ?? '')

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }

    // Reject requests from disallowed origins
    if (!originAllowed(requestOrigin, env.ALLOWED_ORIGIN)) {
      return new Response(
        JSON.stringify({ error: { message: 'Origin not allowed' } }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...cors } },
      )
    }

    // Rate limiting
    const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0'
    const rl = checkRateLimit(ip)

    const rlHeaders = {
      'X-RateLimit-Limit': String(RATE_LIMIT_REQUESTS),
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
    }

    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: { message: `Rate limit exceeded — ${RATE_LIMIT_REQUESTS} requests/hour. Try again later.` } }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...cors, ...rlHeaders },
        },
      )
    }

    // Parse + sanitise the request body
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return new Response(
        JSON.stringify({ error: { message: 'Invalid JSON body' } }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...cors } },
      )
    }

    // Enforce max_tokens cap so a rogue client can't burn the budget
    if (typeof body.max_tokens !== 'number' || body.max_tokens > MAX_TOKENS_CAP) {
      body.max_tokens = MAX_TOKENS_CAP
    }

    // Forward to Anthropic (do NOT forward x-api-key from client — inject our own)
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    // Stream the Anthropic response back to the browser
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
        'Cache-Control': 'no-store',
        ...cors,
        ...rlHeaders,
      },
    })
  },
}
