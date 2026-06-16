import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock './api' để không kéo axios + interceptor thật vào test
vi.mock('./api', () => ({
  default: {},
  getAuthToken: () => 'fake-jwt-token',
}))

import { qaService } from './qa'

/** Tạo fake fetch trả về SSE body, chia byte theo `chunks` để test logic buffer qua ranh giới chunk. */
function mockFetchSSE(chunks, { ok = true, status = ok ? 200 : 429, detail } = {}) {
  const encoder = new TextEncoder()
  let i = 0
  const reader = {
    read: async () => {
      if (i >= chunks.length) return { done: true, value: undefined }
      return { done: false, value: encoder.encode(chunks[i++]) }
    },
  }
  return vi.fn(async () => ({
    ok,
    status,
    body: ok ? { getReader: () => reader } : null,
    json: async () => ({ detail }),
  }))
}

/** Chạy streamAsk, thu cả token / error / done theo thứ tự phát ra. */
function collectEvents(...args) {
  return new Promise((resolve) => {
    const events = []
    qaService.streamAsk(
      ...args,
      (t) => events.push({ type: 'token', value: t }),
      () => { events.push({ type: 'done' }); resolve(events) },
      (info) => events.push({ type: 'error', info }),
    )
  })
}

/** Chạy streamAsk tới khi onDone, trả về danh sách token nhận được. */
function collectTokens(...args) {
  return new Promise((resolve) => {
    const tokens = []
    qaService.streamAsk(
      ...args,
      (t) => tokens.push(t),
      () => resolve(tokens),
    )
  })
}

beforeEach(() => {
  localStorage.setItem('fdocs-gemini-key', 'test-key')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('qaService.streamAsk', () => {
  it('parses JSON-encoded tokens and stops at [DONE]', async () => {
    global.fetch = mockFetchSSE(['data: "Hello"\n\ndata: " world"\n\ndata: [DONE]\n\n'])
    const tokens = await collectTokens('doc1', 'câu hỏi?')
    expect(tokens).toEqual(['Hello', ' world'])
  })

  it('reassembles tokens split across stream chunk boundaries', async () => {
    // 'data: "Hel' + 'lo"\n\n' phải ghép lại thành token "Hello"
    global.fetch = mockFetchSSE(['data: "Hel', 'lo"\n\n', 'data: [DONE]\n\n'])
    const tokens = await collectTokens('doc1', 'q')
    expect(tokens).toEqual(['Hello'])
  })

  it('decodes unicode-escaped tokens (tiếng Việt) back to original', async () => {
    // Backend json.dumps(ensure_ascii) → "Đây" ; client JSON.parse phải decode lại
    global.fetch = mockFetchSSE(['data: "\\u0110\\u00e2y"\n\ndata: [DONE]\n\n'])
    const tokens = await collectTokens('doc1', 'q')
    expect(tokens).toEqual(['Đây'])
  })

  it('preserves newlines inside a token', async () => {
    global.fetch = mockFetchSSE(['data: "line1\\nline2"\n\ndata: [DONE]\n\n'])
    const tokens = await collectTokens('doc1', 'q')
    expect(tokens).toEqual(['line1\nline2'])
  })

  it('sends Authorization and X-Gemini-Key headers', async () => {
    const fetchMock = mockFetchSSE(['data: [DONE]\n\n'])
    global.fetch = fetchMock
    await collectTokens('doc42', 'q')
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/documents/doc42/qa/stream')
    expect(opts.headers['Authorization']).toBe('Bearer fake-jwt-token')
    expect(opts.headers['X-Gemini-Key']).toBe('test-key')
    expect(JSON.parse(opts.body)).toEqual({ question: 'q' })
  })

  it('calls onDone without throwing when response is not ok', async () => {
    global.fetch = mockFetchSSE([], { ok: false })
    const tokens = await collectTokens('doc1', 'q')
    expect(tokens).toEqual([])
  })

  it('returns a cancel function', () => {
    global.fetch = mockFetchSSE(['data: [DONE]\n\n'])
    const cancel = qaService.streamAsk('d', 'q', () => {}, () => {})
    expect(typeof cancel).toBe('function')
    cancel()
  })

  it('routes an in-band error frame to onError after streamed tokens, then done', async () => {
    global.fetch = mockFetchSSE([
      'data: "Đây "\n\ndata: {"error": "quota", "detail": "Hết quota"}\n\n',
    ])
    const events = await collectEvents('d', 'q')
    expect(events).toEqual([
      { type: 'token', value: 'Đây ' },
      { type: 'error', info: { error: 'quota', detail: 'Hết quota' } },
      { type: 'done' },
    ])
  })

  it('does not emit [DONE] handling once an error frame terminates the stream', async () => {
    // A stray [DONE] after the error frame must never be reached.
    global.fetch = mockFetchSSE([
      'data: {"error": "service", "detail": "x"}\n\ndata: [DONE]\n\n',
    ])
    const events = await collectEvents('d', 'q')
    expect(events.filter((e) => e.type === 'token')).toEqual([])
    expect(events[0]).toEqual({ type: 'error', info: { error: 'service', detail: 'x' } })
  })

  it('surfaces a non-ok response detail via onError', async () => {
    global.fetch = mockFetchSSE([], { ok: false, status: 429, detail: 'Đã vượt quota Gemini' })
    const events = await collectEvents('d', 'q')
    const err = events.find((e) => e.type === 'error')
    expect(err.info).toEqual({ error: '429', detail: 'Đã vượt quota Gemini' })
  })
})
