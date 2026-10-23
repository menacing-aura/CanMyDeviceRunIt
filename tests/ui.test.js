import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../src/app.js', import.meta.url);

test('custom specifications expose the compatibility details the engine can use', async () => {
  const app = await readFile(appUrl, 'utf8');
  assert.doesNotMatch(app, /<\/option\s+value=/, 'option markup must be well formed');
  assert.match(app, /name="osVersion"/);
  assert.match(app, /name="runtimeArchitecture"/);
  assert.match(app, /osVersion: data\.get\('osVersion'\)/);
  assert.match(app, /runtimeArchitecture: data\.get\('runtimeArchitecture'\)/);
});

test('every configured local cover points to a committed asset', async () => {
  const app = await readFile(appUrl, 'utf8');
  const block = app.match(/const covers = \{([^;]+)\};/s);
  assert.ok(block, 'cover mapping should exist');
  const files = [...block[1].matchAll(/:\s*'([^']+)'/g)].map(match => match[1]);
  assert.ok(files.length > 0, 'at least one local cover should be configured');
  for (const file of files) {
    await access(new URL(`../public/assets/${file}`, import.meta.url));
  }
});

test('saved free storage can be restored for catalog devices', async () => {
  const app = await readFile(appUrl, 'utf8');
  assert.match(app, /storedCatalogDevice/);
  assert.match(app, /stored\.freeStorage <= storedCatalogDevice\.storage/);
});
