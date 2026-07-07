const SYSTEM_PROMPT = `You are Vee, the AI assistant for Vouza — an enterprise AI-assistant company serving Singapore, Malaysia, and Southeast Asia.

Vouza's offerings:
- Specialized AI Assistants for every department: Admin, Accounting, Quality Engineering, Marketing, Sourcing, Buyer, Engineering, and WhatsApp AI.
- Website & App Integration — embed one unified AI assistant across web, iOS, and Android.
- Robotics Solutions — humanoid robots for customer service/logistics, autonomous robot dogs for industrial inspection.
- AI Camera Systems — vision AI for real-time monitoring and anomaly detection.
- Admin AI is free and open-source to download and try today: https://github.com/geechun80/vouza-admin-agent

Keep replies concise (2-4 sentences), friendly, and helpful. If someone wants a demo, pricing, or to talk to the team, direct them to the contact form on this page or hello@vouza.ai — do not invent pricing or specific SLAs. If they ask about trying something for free, mention Admin AI's GitHub download. Stay on topic: you represent Vouza, so politely redirect unrelated requests back to how Vouza can help their business.`;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LEN = 2000;
const RATE_LIMIT = 8;        // requests…
const RATE_WINDOW_MS = 60000; // …per fixed 60s window, per IP

export class RateLimiter {
  constructor(state) {
    this.state = state;
  }
  async fetch() {
    const window = Math.floor(Date.now() / RATE_WINDOW_MS);
    const data = (await this.state.storage.get('w')) || { window: 0, count: 0 };
    if (data.window !== window) {
      data.window = window;
      data.count = 0;
    }
    data.count++;
    await this.state.storage.put('w', data);
    return new Response(JSON.stringify({ allowed: data.count <= RATE_LIMIT, count: data.count }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function corsHeaders(allowedOrigin) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers });
    }

    const origin = request.headers.get('Origin') || '';
    if (origin !== env.ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
        status: 403,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    try {
      const stub = env.RATE_LIMITER_DO.get(env.RATE_LIMITER_DO.idFromName(ip));
      const check = await stub.fetch('https://limiter/');
      const { allowed } = await check.json();
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429,
          headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
    } catch {
      // If the rate limiter itself fails, allow the request rather than break chat.
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: 'Invalid message count' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
    for (const m of messages) {
      if (
        typeof m.content !== 'string' ||
        m.content.length === 0 ||
        m.content.length > MAX_MESSAGE_LEN ||
        (m.role !== 'user' && m.role !== 'assistant')
      ) {
        return new Response(JSON.stringify({ error: 'Invalid message format' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
    }

    const wantStream = body.stream === true;

    let upstream;
    try {
      upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.ALLOWED_ORIGIN,
          'X-Title': 'Vouza Vee Chat',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4.5',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
          max_tokens: 500,
          temperature: 0.6,
          stream: wantStream,
        }),
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: 'Upstream error', detail: errText.slice(0, 300) }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (wantStream) {
      // Pass OpenRouter's SSE stream straight through to the browser.
      return new Response(upstream.body, {
        status: 200,
        headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a reply just now.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  },
};
