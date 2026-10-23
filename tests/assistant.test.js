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

  const origin = await onRequest({ request: createRequest(payload, { origin: 'https://attacker.example' }), env: {} });
  assert.equal(origin.status, 403);

  const contentType = await onRequest({ request: createRequest(payload, { contentType: 'text/plain' }), env: {} });
  assert.equal(contentType.status, 415);
});

test('assistant validates input and gives an actionable unconfigured error', async () => {
  const oversized = await onRequest({ request: createRequest(payload, { contentLength: '5001' }), env: {} });
  assert.equal(oversized.status, 413);

  const malformed = await onRequest({ request: createRequest(undefined, { rawBody: '{invalid' }), env: {} });
  assert.equal(malformed.status, 400);

  const incomplete = await onRequest({ request: createRequest({ ...payload, question: 'no' }), env: {} });
  assert.equal(incomplete.status, 400);

  const unconfigured = await onRequest({ request: createRequest(), env: {} });
  assert.equal(unconfigured.status, 503);
  assert.match((await responseBody(unconfigured)).error, /GEMINI_API_KEY or GROQ_API_KEY/);
});

test('assistant uses Gemini first and returns Interactions API text', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  try {
    globalThis.fetch = async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return Response.json({
        steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Gemini says the GPU needs verification.' }] }],
      });
    };

    const response = await onRequest({
      request: createRequest(),
      env: { GEMINI_API_KEY: 'gemini-test-secret', GEMINI_MODEL: 'gemini-test-model', GROQ_API_KEY: 'groq-unused' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await responseBody(response), { answer: 'Gemini says the GPU needs verification.', provider: 'Gemini' });
    assert.equal(requestUrl, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(requestOptions.headers['x-goog-api-key'], 'gemini-test-secret');
    const body = JSON.parse(requestOptions.body);
    assert.equal(body.model, 'gemini-test-model');
    assert.match(body.input, /Example minimum GPU/);
    assert.match(body.input, /Why is the GPU a concern/);
    assert.match(body.system_instruction, /source of truth/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('assistant falls back to Groq when Gemini fails', async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const calls = [];
  try {
    console.error = () => {};
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.includes('generativelanguage.googleapis.com')) return new Response('nope', { status: 429 });
      return Response.json({ choices: [{ message: { content: 'Groq fallback answer.' } }] });
    };

    const response = await onRequest({
      request: createRequest(),
      env: { GEMINI_API_KEY: 'gemini-test', GROQ_API_KEY: 'groq-test', GROQ_MODEL: 'groq-model' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await responseBody(response), { answer: 'Groq fallback answer.', provider: 'Groq' });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].options.headers.Authorization, 'Bearer groq-test');
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test('assistant never exposes upstream error details or secrets', async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  try {
    console.error = () => {};
    globalThis.fetch = async () => new Response('private upstream details', { status: 401 });

    const response = await onRequest({
      request: createRequest(),
      env: { GEMINI_API_KEY: 'gemini-secret', GROQ_API_KEY: 'groq-secret' },
    });
    assert.equal(response.status, 502);
    const body = JSON.stringify(await responseBody(response));
    assert.doesNotMatch(body, /private upstream details|gemini-secret|groq-secret/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});
