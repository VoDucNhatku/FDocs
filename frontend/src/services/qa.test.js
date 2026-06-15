import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock './api' để không kéo axios + interceptor thật vào test
vi.mock('./api', () => ({
  default: {},
  getAuthToken: () => 'fake-jwt-token',
}))

import { qaService } from './qa'

/** Tạo fake fetch trả về SSE body, chia byte theo `chunks` để test logic buffer qua ranh giới chunk. */
function mockFetchSSE(chunks, { ok = true } = {}) {
  const encoder = new TextEncoder()
  let i = 0
  const reader = {
    read: async () => {
      if (i >= chunks.length) return { done: true, value: undefined }
      return { done: false, value: encoder.encode(chunks[i++]) }
    },
  }
  return vi.fn(async () => ({ ok, body: ok ? { getReader: () => reader } : null }))
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
})
