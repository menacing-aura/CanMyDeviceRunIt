import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest } from '../functions/api/assistant.js';

const payload = {
  question: 'Why is the GPU a concern?',
  device: {
    name: 'Example laptop', os: 'Windows 11', cpu: 'Example CPU', gpu: 'Example GPU', ram: 8, freeStorage: 20,
  },
  game: {
    name: 'Example game', platforms: ['windows'],
    requirement: { os: 'Windows 10', cpu: 'Example minimum CPU', gpu: 'Example minimum GPU', ram: 8, storage: 40 },
  },
  compatibility: { label: 'Limited', summary: 'The graphics requirement is unknown.', settings: 'Use low settings.' },
};

function createRequest(body = payload, options = {}) {
  return new Request('https://example.com/api/assistant', {
    method: options.method || 'POST',
    headers: {
      'Content-Type': options.contentType || 'application/json',
      ...(options.origin ? { Origin: options.origin } : {}),
      ...(options.contentLength ? { 'Content-Length': options.contentLength } : {}),
    },
    body: options.method === 'GET' || options.method === 'HEAD' ? undefined : options.rawBody ?? JSON.stringify(body),
  });
}

async function responseBody(response) {
  return response.json();
}

test('assistant rejects invalid methods, cross-origin requests, and unsupported content types', async () => {
  const method = await onRequest({ request: createRequest(payload, { method: 'GET' }), env: {} });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('Allow'), 'POST');
  assert.equal((await responseBody(method)).error, 'Method not allowed.');

  const origin = await onRequest({ request: createRequest(payload, { origin: 'https://attacker.example' }), env: {} });
  assert.equal(origin.status, 403);

  const contentType = await onRequest({ request: createRequest(payload, { contentType: 'text/plain' }), env: {} });
  assert.equal(contentType.status, 415);

  const invalidJsonContentType = await onRequest({ request: createRequest(payload, { contentType: 'application/jsonp' }), env: {} });
  assert.equal(invalidJsonContentType.status, 415);
});

test('assistant rejects oversized, malformed, and incomplete input without calling Groq', async () => {
  const oversized = await onRequest({ request: createRequest(payload, { contentLength: '5001' }), env: {} });
  assert.equal(oversized.status, 413);

  const oversizedBody = await onRequest({ request: createRequest(undefined, { rawBody: ' '.repeat(5001) }), env: {} });
  assert.equal(oversizedBody.status, 413);

  const malformed = await onRequest({ request: createRequest(undefined, { rawBody: '{invalid' }), env: {} });
  assert.equal(malformed.status, 400);

  const incomplete = await onRequest({ request: createRequest({ ...payload, question: 'no' }), env: {} });
  assert.equal(incomplete.status, 400);

  const unconfigured = await onRequest({ request: createRequest(), env: {} });
  assert.equal(unconfigured.status, 503);
});

test('assistant sends bounded comparison context to Groq and returns plain answer text', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  try {
    globalThis.fetch = async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return Response.json({ choices: [{ message: { content: 'The graphics requirement is uncertain.' } }] });
    };
    const response = await onRequest({
      request: createRequest(),
      env: { GROQ_API_KEY: 'test-secret', GROQ_MODEL: 'test-model' },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await responseBody(response), { answer: 'The graphics requirement is uncertain.' });
    assert.equal(requestUrl, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(requestOptions.headers.Authorization, 'Bearer test-secret');
    const body = JSON.parse(requestOptions.body);
    assert.equal(body.model, 'test-model');
    assert.match(body.messages[1].content, /Example minimum GPU/);
    assert.match(body.messages[1].content, /Why is the GPU a concern/);
    assert.equal(body.tools, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('assistant does not expose Groq error details or return empty successful responses', async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  try {
    console.error = () => {};
    globalThis.fetch = async () => new Response('private upstream details', { status: 401 });
    const upstreamError = await onRequest({ request: createRequest(), env: { GROQ_API_KEY: 'test-secret' } });
    assert.equal(upstreamError.status, 502);
    assert.doesNotMatch(JSON.stringify(await responseBody(upstreamError)), /private upstream details|test-secret/);

    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: '' } }] });
    const empty = await onRequest({ request: createRequest(), env: { GROQ_API_KEY: 'test-secret' } });
    assert.equal(empty.status, 502);
    assert.match((await responseBody(empty)).error, /empty response/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});
